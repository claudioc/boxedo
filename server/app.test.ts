import { it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import bootstrap from './lib/bootstrap';
import type { FastifyInstance } from 'fastify';
import { load } from 'cheerio';
import { dbService } from './services/dbService';

let app: FastifyInstance;

beforeAll(async () => {
  app = await bootstrap(true);
  await dbService(app.dbClient).nukeTests();
});

beforeEach(async () => {
  await dbService(app.dbClient).nukeTests();
});

afterAll(async () => {
  if (!app) return;
  await app.close();
});

const TOP_LEVEL_PAGE_1_ID = 'top-level-page:1';

it('should show an empty home page', async () => {
  const response = await app.inject({ url: '/' });
  const $ = load(response.body);
  expect($('h1').text()).toBe('Welcome to Joongle!');
  // expect($('p.empty-index-placeholder').text()).toContain('Create this page');
});

it('should return no navigation items', async () => {
  const response = await app.inject({ url: '/parts/nav/' });
  const $ = load(response.body);
  expect($('body').text()).toBe('Not working yet');
});

it('should show a feedback when a code is passed', async () => {
  const response = await app.inject({ url: '/?f=1' });
  const $ = load(response.body);
  expect($('[role="status"]').text()).toContain('Page created');
});

// it('should create the index page', async () => {
//   await app.inject({
//     url: '/edit/page:itdoesnotmatter',
//     method: 'POST',
//     payload: {
//       pageTitle: 'Home Page',
//       pageContent: 'Some proper content<br>',
//     },
//   });

//   const response = await app.inject({ url: '/' });

//   const $ = cheerio.load(response.body);
//   expect($('h1').text()).toBe('Home Page');
// });

it('should return matching titles', async () => {
  let response = await app.inject({ url: '/parts/titles?q=home+page' });

  // let $ = load(response.body);
  // expect($('li').length).toBe(1);

  // response = await app.inject({ url: '/parts/titles?q=ho' });

  let $ = load(response.body);
  expect($('li').length).toBe(0);

  response = await app.inject({ url: '/parts/titles?q=fooooooo' });

  $ = load(response.body);
  expect($('li').length).toBe(0);
});

it.skip('should return one navigation items', async () => {
  const response = await app.inject({ url: '/parts/nav/' });
  const $ = load(response.body);
  const $a = $('a');
  expect($a.attr('href')).toBe('/');
  expect($a.text()).toBe('Home Page updated!');
});

it.skip('should add a new top level page', async () => {
  await app.inject({
    url: '/create',
    method: 'POST',
    payload: {
      pageTitle: 'New top level page',
      pageContent: 'More content is provided',
    },
  });

  let response = await app.inject({ url: '/page/new-top-level-page' });

  let $ = load(response.body);
  expect($('h1').text()).toBe('New top level page');

  response = await app.inject({ url: '/parts/nav' });
  $ = load(response.body);
  const $a = $('a');
  expect($a.length).toBe(2);
  expect($a.eq(1).attr('href')).toBe('/page/second-page');
});
