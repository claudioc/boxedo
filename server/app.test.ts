import { it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import bootstrap from './lib/bootstrap';
import type { FastifyInstance } from 'fastify';
import { type CheerioAPI, load } from 'cheerio';
import { dbService } from './services/dbService';

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

const createPage = async (pageTitle: string, pageContent = 'content') => {
  const response = await app.inject({
    url: '/create',
    method: 'POST',
    payload: {
      pageTitle,
      pageContent,
    },
  });
  return response;
};

it('should not find a url', async () => {
  const response = await getUrl('/what-is-this');
  expect(response.statusCode).toBe(404);
});

it('should show the welcome page', async () => {
  const $ = await getContent('/');
  const $el = $('.is-welcome');

  expect($el).toHaveLength(1);
  expect($el.hasClass('is-page')).toBe(false);
  expect($el.hasClass('is-landing')).toBe(false);

  expect($('.page-actions')).toHaveLength(0);
});

it('should create a page', async () => {
  const response = await createPage('First and only page');
  expect(response.statusCode).toBe(303);
  expect(response.headers.location).toBe('/page/first-and-only-page?f=1');
});

it('should not find a page', async () => {
  const response = await getUrl('/page/baaaah');
  expect(response.statusCode).toBe(404);
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

it('should set a different landing page in the settings', async () => {
  let response = await createPage('First and only page');

  response = await createPage('Another page, actually');
  const pageId = response.headers['x-page-id'] as string;

  await postUrl('/settings', {
    landingPageId: pageId,
    siteLang: 'en',
  });

  const $ = await getContent('/');

  const $el = $('.is-page');
  expect($el).toHaveLength(1);
  expect($el.hasClass('is-welcome')).toBe(false);
  expect($el.hasClass('is-landing')).toBe(true);
  // Should show the oldest one
  expect($el.data('page-id')).toBe(pageId);
});

it('should return no navigation items', async () => {
  const $ = await getContent('/parts/nav/');
  expect($('body').text()).toBe('Create your first page');
});

it('should show a feedback when a code is passed', async () => {
  const $ = await getContent('/?f=1');
  expect($('[role="status"]').text()).toContain('Page created');
});

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
