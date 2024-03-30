import { test, expect, beforeAll, afterAll } from 'vitest';
import bootstrap from './lib/bootstrap';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(() => {
  app = bootstrap();
});

afterAll(async () => {
  await app.close();
});

test('should return Hello', async () => {
  const response = await app.inject({ url: '/' });
  expect(await response.body).toBe('Hello');
  await app.close();
});
