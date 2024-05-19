import { it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import bootstrap from './lib/bootstrap';
import { FastifyInstance } from 'fastify';
import cheerio from 'cheerio';
import { dbService } from './services/dbService';

let app: FastifyInstance;

beforeAll(async () => {
  app = await bootstrap(true);
  await dbService(app.dbClient).nukeTests();
});

beforeEach(async () => {
  // await dbService(app.dbClient).nukeTests();
});

afterAll(async () => {
  if (!app) return;
  await app.close();
});

it('should show an empty home page', async () => {
  const response = await app.inject({ url: '/' });
  const $ = cheerio.load(response.body);
  expect($('h1').text()).toBe('Welcome to Joongle!');
  expect($('p.empty-index-placeholder').text()).toContain('Create this page');
});

it('should return no navigation items', async () => {
  const response = await app.inject({ url: `/parts/nav/` });
  const $ = cheerio.load(response.body);
  expect($('body').text()).toBe('There are no pages');
});

it('should show a feedback when a code is passed', async () => {
  const response = await app.inject({ url: '/?f=1' });
  const $ = cheerio.load(response.body);
  expect($('[role="status"]').text()).toContain('Page created');
});

it('should create the index page', async () => {
  await app.inject({
    url: `/edit/page:itdoesnotmatter`,
    method: 'POST',
    payload: {
      pageTitle: 'Home Page',
      pageContent: 'Some proper content<br>',
    },
  });

  const response = await app.inject({ url: '/' });

  const $ = cheerio.load(response.body);
  expect($('h1').text()).toBe('Home Page');
});

it('should edit the index page', async () => {
  const rootPage = await dbService(app.dbClient).getRootPage();

  await app.inject({
    url: `/edit/${rootPage?._id}`,
    method: 'POST',
    payload: {
      pageTitle: 'Home Page updated!',
      pageContent: 'Some proper content<br>',
    },
  });

  const response = await app.inject({ url: '/' });

  const $ = cheerio.load(response.body);
  expect($('h1').text()).toBe('Home Page updated!');
});

it('should return matching titles', async () => {
  let response = await app.inject({ url: '/parts/titles?q=home+page' });

  let $ = cheerio.load(response.body);
  expect($('li').length).toBe(1);

  response = await app.inject({ url: '/parts/titles?q=ho' });

  $ = cheerio.load(response.body);
  expect($('li').length).toBe(0);

  response = await app.inject({ url: '/parts/titles?q=fooooooo' });

  $ = cheerio.load(response.body);
  expect($('li').length).toBe(0);
});

it('should return one navigation items', async () => {
  const response = await app.inject({ url: `/parts/nav/` });
  const $ = cheerio.load(response.body);
  const $a = $('a');
  expect($a.attr('href')).toBe('/');
  expect($a.text()).toBe('Home Page updated!');
});

it.skip('should add a new page', async () => {
  const rootPage = await dbService(app.dbClient).getRootPage();

  await app.inject({
    url: `/create/${rootPage?._id}`,
    method: 'POST',
    payload: {
      pageTitle: 'Second page',
      pageContent: 'More content is provided',
    },
  });

  let response = await app.inject({ url: '/page/second-page' });

  let $ = cheerio.load(response.body);
  expect($('h1').text()).toBe('Second page');

  response = await app.inject({ url: `/parts/nav/${rootPage?._id}` });
  $ = cheerio.load(response.body);
  const $a = $('a');
  expect($a.length).toBe(2);
  expect($a.eq(1).attr('href')).toBe('/page/second-page');
});
