import { test, expect, beforeAll, afterAll } from 'vitest';
import bootstrap from './lib/bootstrap';
import { FastifyInstance } from 'fastify';
import cheerio from 'cheerio';

let app: FastifyInstance;

beforeAll(() => {
  app = bootstrap();
});

afterAll(async () => {
  await app.close();
});

test('should show an empty home page', async () => {
  const response = await app.inject({ url: '/' });
  const $ = cheerio.load(await response.body);
  expect($('h1').text()).toBe('Welcome to Joongle!');
  expect($('p.empty-index-placeholder').text()).toContain('Create this page');

  await app.close();
});
