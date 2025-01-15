import { it, expect, describe, beforeAll, afterAll, beforeEach } from 'vitest';
import bootstrap from './lib/bootstrap';
import type { FastifyInstance } from 'fastify';
import { type CheerioAPI, load } from 'cheerio';
import { dbService } from './services/dbService';
import type { SettingsModelWithoutId } from '../types';
import { POSITION_GAP_SIZE } from './constants';

let app: FastifyInstance;

beforeAll(async () => {
  app = await bootstrap(true);
  // await dbService(app.dbClient).nukeTests();
});

beforeEach(async () => {
  await dbService(app.dbClient).nukeTests();
});

afterAll(async () => {
  if (!app) return;
  await app.close();
});

const postUrl = async (path: string, payload: Record<string, string>) => {
  await app.inject({
    url: path,
    method: 'POST',
    payload,
  });
};

const getUrl = async (url: string) => {
  const response = await app.inject({ url });
  return response;
};

const getContent: (url: string) => Promise<CheerioAPI> = async (url) => {
  const response = await app.inject({ url });
  return load(response.body);
};

const getPage = async (slug: string) => app.inject({ url: `/page/${slug}` });

const createPage = async (
  pageTitle: string,
  pageContent = 'content',
  parentId: string | null = null
) => {
  const response = await app.inject({
    url: `/create${parentId ? `/${parentId}` : ''}`,
    method: 'POST',
    payload: {
      pageTitle,
      pageContent,
    },
  });
  return response;
};

describe('Welcome page', () => {
  it('should show the welcome page', async () => {
    const $ = await getContent('/');
    const $el = $('.is-welcome');

    expect($el).toHaveLength(1);
    expect($el.hasClass('is-page')).toBe(false);
    expect($el.hasClass('is-landing')).toBe(true);

    expect($('.page-actions')).toHaveLength(0);
  });

  it('should show the landing page as the first page created', async () => {
    const response = await createPage('First and only page');
    const pageId = response.headers['x-page-id'];
    await createPage('Another page, actually');

    const $ = await getContent('/');
    const $el = $('.is-page');
    expect($el).toHaveLength(1);
    expect($el.hasClass('is-welcome')).toBe(false);
    expect($el.hasClass('is-landing')).toBe(true);
    // Should show the oldest one
    expect($el.data('page-id')).toBe(pageId);
  });
});

describe('Not finding stuff', () => {
  it('should not find a url', async () => {
    const response = await getUrl('/what-is-this');
    expect(response.statusCode).toBe(404);
  });

  it('should not find a page', async () => {
    const response = await getUrl('/page/baaaah');
    expect(response.statusCode).toBe(404);
  });
});

describe('Settings', () => {
  it('should set a different landing page in the settings', async () => {
    let response = await createPage('First and only page');

    response = await createPage('Another page, actually');
    const pageId = response.headers['x-page-id'] as string;

    const settings: SettingsModelWithoutId = {
      landingPageId: pageId,
      siteLang: 'en',
      siteTitle: 'Joongle',
      siteDescription: '',
    };

    await postUrl('/settings', settings as Record<string, string>);

    const $ = await getContent('/');

    const $el = $('.is-page');
    expect($el).toHaveLength(1);
    expect($el.hasClass('is-welcome')).toBe(false);
    expect($el.hasClass('is-landing')).toBe(true);
    // Should show the oldest one
    expect($el.data('page-id')).toBe(pageId);
  });
});

describe('Creating page', () => {
  it('should create a page', async () => {
    const response = await createPage('First and only page');
    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe('/page/first-and-only-page?f=1');
  });

  it('should show a feedback when a code is passed', async () => {
    const $ = await getContent('/?f=1');
    expect($('[role="status"]').text()).toContain('Page created');
  });
});

describe('Navigation', () => {
  it('should return no navigation items', async () => {
    const $ = await getContent('/parts/nav/');
    expect($('body').text()).toBe('');
  });

  it('should return no navigation items', async () => {
    const $ = await getContent('/parts/nav');
    const $a = $('a');
    expect($a).toHaveLength(0);
  });

  it('should return one navigation items', async () => {
    await createPage('First and only page');
    const $ = await getContent('/parts/nav');
    const $a = $('a');
    expect($a).toHaveLength(1);
  });

  it('should return three navigation items, in the insert order', async () => {
    await createPage('First page');
    await createPage('Second page');
    await createPage('Third page');
    const $ = await getContent('/parts/nav');
    const $a = $('a');
    expect($a).toHaveLength(3);
    expect($a.eq(0).text()).toBe('First page');
    expect($a.eq(1).text()).toBe('Second page');
    expect($a.eq(2).text()).toBe('Third page');
    expect($a.eq(0).data('position')).toBe(POSITION_GAP_SIZE);
    expect($a.eq(1).data('position')).toBe(POSITION_GAP_SIZE * 2);
    expect($a.eq(2).data('position')).toBe(POSITION_GAP_SIZE * 3);
  });
});

describe('Deleting pages', () => {
  it('should delete a page', async () => {
    let resp = await createPage('First page');
    const pageId = (resp.headers['x-page-id'] ?? '') as string;
    await createPage('Second page');

    resp = await getPage('first-page');
    expect(resp.statusCode).toBe(200);

    await postUrl('/delete', {
      pageId,
    });

    resp = await getPage('first-page');
    expect(resp.statusCode).toBe(404);
    resp = await getPage('second-page');
    expect(resp.statusCode).toBe(200);
  });
});

describe('Moving pages', () => {
  it('should move a page to the top level', async () => {
    await createPage('First page');
    let resp = await createPage('Second page');
    const parentPageId = resp.headers['x-page-id'] as string;

    resp = await createPage('Third page', 'something', parentPageId);
    const childPageId = resp.headers['x-page-id'];

    resp = await getPage('third-page');
    expect(resp.headers['x-parent-id']).toBe(parentPageId);

    await postUrl(`/move/${childPageId}`, {
      moveToTop: 'true',
    });

    resp = await getPage('third-page');
    expect(resp.headers['x-parent-id']).toBe('');
  });

  it('should move a page to another parent', async () => {
    let resp = await createPage('First page');
    const firstPageId = resp.headers['x-page-id'] as string;

    resp = await createPage('Second page');
    const parentPageId = resp.headers['x-page-id'] as string;

    resp = await createPage('Third page', 'something', parentPageId);
    const childPageId = resp.headers['x-page-id'];

    resp = await getPage('third-page');
    expect(resp.headers['x-parent-id']).toBe(parentPageId);

    await postUrl(`/move/${childPageId}`, {
      moveToTop: 'false',
      newParentId: firstPageId,
    });

    resp = await getPage('third-page');
    expect(resp.headers['x-parent-id']).toBe(firstPageId);
  });
});

describe('Reordering pages', () => {
  it('should return tree navigation items, and change the order of the first one', async () => {
    const pageIds = [];

    let response = await createPage('First page');
    pageIds[0] = response.headers['x-page-id'];

    response = await createPage('Second page');
    pageIds[1] = response.headers['x-page-id'];

    response = await createPage('Third page');
    pageIds[2] = response.headers['x-page-id'];

    // Move the second page at the top
    await postUrl(`/reorder/${pageIds[2]}`, {
      targetIndex: '0',
    });

    const $ = await getContent('/parts/nav');
    const $a = $('a');
    expect($a).toHaveLength(3);
    expect($a.eq(0).text()).toBe('Third page');
    expect($a.eq(1).text()).toBe('First page');
    expect($a.eq(2).text()).toBe('Second page');
    expect($a.eq(0).data('position')).toBe(POSITION_GAP_SIZE / 2);
    expect($a.eq(1).data('position')).toBe(POSITION_GAP_SIZE * 1);
    expect($a.eq(2).data('position')).toBe(POSITION_GAP_SIZE * 2);
  });

  it('should return reorder within the parent', async () => {
    const pageIds = [];

    let response = await createPage('First page');
    pageIds[0] = response.headers['x-page-id'];

    response = await createPage('Second page');
    pageIds[1] = response.headers['x-page-id'] as string;

    response = await createPage(
      'Second page, first child',
      'something',
      pageIds[1]
    );
    pageIds[2] = response.headers['x-page-id'];

    response = await createPage(
      'Second page, second child',
      'something',
      pageIds[1]
    );
    pageIds[3] = response.headers['x-page-id'];

    // Move the second page at the top
    await postUrl(`/reorder/${pageIds[3]}`, {
      targetIndex: '0',
    });

    const $ = await getContent('/parts/nav');
    const $a = $('a');
    expect($a).toHaveLength(4);
    expect($a.eq(0).text()).toBe('First page');
    expect($a.eq(1).text()).toBe('Second page');
    expect($a.eq(2).text()).toBe('Second page, second child');
    expect($a.eq(3).text()).toBe('Second page, first child');
  });
});

describe('Searching titles', () => {
  it('should return matching titles', async () => {
    await createPage('First and only page');
    await createPage('Second and only page');
    await createPage('Third and only page');

    let $ = await getContent('/parts/titles?q=First');
    expect($('li').length).toBe(1);

    $ = await getContent('/parts/titles?q=only+Page');
    expect($('li').length).toBe(3);

    $ = await getContent('/parts/titles?q=foooobar');
    expect($('li').length).toBe(0);
  });
});
