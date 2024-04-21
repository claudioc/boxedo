import { it, expect, beforeAll, afterAll } from 'vitest';
import bootstrap from './lib/bootstrap';
import { FastifyInstance } from 'fastify';
import cheerio from 'cheerio';
import { INDEX_PAGE_ID } from './constants';

let app: FastifyInstance;

beforeAll(async () => {
  app = await bootstrap();
});

afterAll(async () => {
  await app.close();
});

it('should show an empty home page', async () => {
  const response = await app.inject({ url: '/' });
  const $ = cheerio.load(await response.body);
  expect($('h1').text()).toBe('Welcome to Joongle!');
  expect($('p.empty-index-placeholder').text()).toContain('Create this page');
});

it('should show a feedback when a code is passed', async () => {
  const response = await app.inject({ url: '/?f=1' });
  const $ = cheerio.load(await response.body);
  expect($('[role="status"]').text()).toContain('Page created');
});

it('should create the index page', async () => {
  await app.inject({
    url: `/edit/${INDEX_PAGE_ID}`,
    method: 'POST',
    payload: { pageTitle: 'Home Page', pageContent: 'Some proper content<br>' },
  });

  const response = await app.inject({ url: '/' });

  const $ = cheerio.load(await response.body);
  expect($('h1').text()).toBe('Home Page');
});

it('should edit the index page', async () => {
  await app.inject({
    url: `/edit/${INDEX_PAGE_ID}`,
    method: 'POST',
    payload: {
      pageTitle: 'Home Page updated!',
      pageContent: 'Some proper content<br>',
    },
  });

  const response = await app.inject({ url: '/' });

  const $ = cheerio.load(await response.body);
  expect($('h1').text()).toBe('Home Page updated!');
});

it('should return mathing titles', async () => {
  let response = await app.inject({ url: '/parts/titles?q=home+page' });

  let $ = cheerio.load(await response.body);
  expect($('li').length).toBe(1);

  response = await app.inject({ url: '/parts/titles?q=ho' });

  $ = cheerio.load(await response.body);
  expect($('li').length).toBe(0);

  response = await app.inject({ url: '/parts/titles?q=fooooooo' });

  $ = cheerio.load(await response.body);
  expect($('li').length).toBe(0);
});
