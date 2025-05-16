import { type CheerioAPI, load } from 'cheerio';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { SettingsModel } from '../types';
import { POSITION_GAP_SIZE } from './constants';
import bootstrap from './lib/bootstrap';
import { DatabaseService } from './services/DatabaseService';

let app: FastifyInstance;

type InjectResponse = Awaited<ReturnType<typeof app.inject>>;

beforeAll(async () => {
  app = await bootstrap(true);
});

beforeEach(async () => {
  await DatabaseService.nukeTests(app.repoFactory.getDb());
});

afterAll(async () => {
  if (!app) return;
  await app.close();
});

const postUrl = async (path: string, payload: Record<string, string>) => {
  return await app.inject({
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

const getPage = async (slug: string) => app.inject({ url: `/view/${slug}` });

const extractIdFrom = (resp: InjectResponse) =>
  resp.headers['x-page-id'] as string;

const createPage = async (
  pageTitle: string,
  pageContent = 'content',
  parentId: string | null = null
) => {
  const response = await app.inject({
    url: `/pages/create${parentId ? `?parentPageId=${parentId}` : ''}`,
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
    const pageId = extractIdFrom(await createPage('First and only page'));
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
    const response = await getUrl('/pages/baaaah');
    expect(response.statusCode).toBe(404);
  });
});

describe('Settings', () => {
  it('should set a different landing page in the settings', async () => {
    let response = await createPage('First and only page');

    response = await createPage('Another page, actually');
    const pageId = extractIdFrom(response);

    const settings: SettingsModel = {
      _id: 'settings',
      type: 'settings',
      landingPageId: pageId,
      siteTitle: 'Boxedo',
      siteDescription: '',
    };

    await postUrl('/settings', settings as unknown as Record<string, string>);

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
    expect(response.headers.location).toBe('/view/first-and-only-page?f=1');
  });

  it('should show a feedback when a code is passed', async () => {
    await createPage('First and only page');
    const $ = await getContent('/?f=1');
    expect($('[role="status"]').text()).toContain('Page created');
  });
});

describe('Editing page', () => {
  it('should change the title of a page', async () => {
    const resp = await createPage('First and only page');
    const pageId = extractIdFrom(resp);
    await postUrl(`/pages/${pageId}/edit`, {
      pageTitle: 'bazinga',
      pageContent: 'content now',
      rev: resp.headers['x-rev'] as string,
    });
    const page = await getPage('bazinga');
    expect(pageId).toBe(extractIdFrom(page));
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
    const pageId = extractIdFrom(resp);

    await createPage('Second page');

    resp = await getPage('first-page');
    expect(resp.statusCode).toBe(200);

    await postUrl(`/pages/${pageId}/delete`, {
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
    const parentPageId = extractIdFrom(resp);

    resp = await createPage('Third page', 'something', parentPageId);
    const childPageId = extractIdFrom(resp);

    resp = await getPage('third-page');
    expect(resp.headers['x-parent-id']).toBe(parentPageId);

    await postUrl(`/pages/${childPageId}/move`, {
      moveToTop: 'true',
    });

    resp = await getPage('third-page');
    expect(resp.headers['x-parent-id']).toBe('');
  });

  it('should move a page to another parent', async () => {
    let resp = await createPage('First page');
    const firstPageId = extractIdFrom(resp);

    resp = await createPage('Second page');
    const parentPageId = extractIdFrom(resp);

    resp = await createPage('Third page', 'something', parentPageId);
    const childPageId = extractIdFrom(resp);

    resp = await getPage('third-page');
    expect(resp.headers['x-parent-id']).toBe(parentPageId);

    await postUrl(`/pages/${childPageId}/move`, {
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
    pageIds[0] = extractIdFrom(response);

    response = await createPage('Second page');
    pageIds[1] = extractIdFrom(response);

    response = await createPage('Third page');
    pageIds[2] = extractIdFrom(response);

    // Move the second page at the top
    await postUrl(`/pages/${pageIds[2]}/reorder`, {
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
    pageIds[0] = extractIdFrom(response);

    response = await createPage('Second page');
    pageIds[1] = extractIdFrom(response);

    response = await createPage(
      'Second page, first child',
      'something',
      pageIds[1]
    );
    pageIds[2] = extractIdFrom(response);

    response = await createPage(
      'Second page, second child',
      'something',
      pageIds[1]
    );
    pageIds[3] = extractIdFrom(response);

    // Move the second page at the top
    await postUrl(`/pages/${pageIds[3]}/reorder`, {
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
