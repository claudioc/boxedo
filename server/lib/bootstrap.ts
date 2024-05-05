/* eslint-disable @typescript-eslint/ban-ts-comment */
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import staticServe from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import nano from 'nano';
import fastifyFavicon from 'fastify-favicon';
import { PinoLoggerOptions } from 'fastify/types/logger';
import fastifyEnv from '@fastify/env';
import path from 'path';
import router from './router';
import { NodeEnv } from '~/types';
import jsxRenderer from './jsxRenderer';
import { FromSchema } from 'json-schema-to-ts';
import { fileURLToPath } from 'url';
import csrfProtection from '@fastify/csrf-protection';
import fastifyCookie from '@fastify/cookie';
import { ASSETS_MOUNT_POINT, ASSETS_PATH } from '~/constants';
import { dbService } from '~/services/dbService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix thread-stream error due to __dirname in pino
if (process.env.NODE_ENV !== 'test') {
  // @ts-ignore
  globalThis.__bundlerPathsOverrides = {
    'thread-stream-worker': path.join(
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      path.dirname(createRequire(import.meta.url).resolve('thread-stream')),
      'lib',
      'worker.js'
    ),
  };
}

const ConfigEnvSchema = {
  type: 'object',
  properties: {
    PORT: { type: 'integer', default: 3000 },
    NODE_ENV: { type: 'string', default: 'development' },
    MONGO_URL: {
      type: 'string',
      default: 'mongodb://localhost:27017/joongle',
    },
  },
} as const;

declare module 'fastify' {
  interface FastifyInstance {
    config: FromSchema<typeof ConfigEnvSchema>;
    dbClient: nano.ServerScope;
  }
}

const envToLogger: Record<NodeEnv, PinoLoggerOptions | boolean> = {
  development: {
    transport: {
      target: '@fastify/one-line-logger',
    },
  },
  production: true,
  test: false,
};

const app = Fastify({
  logger:
    envToLogger[(process.env.NODE_ENV as NodeEnv) || 'development'] ?? true,
});

app.decorate('dbClient', await dbService.init());
await app.register(fastifyCookie);

if (process.env.NODE_ENV !== 'test') await app.register(csrfProtection);

await app.register(fastifyEnv, { schema: ConfigEnvSchema }).then(() => {
  app
    .register(fastifyFavicon, {
      path: './assets',
      name: 'favicon.ico',
      maxAge: 3600,
    })
    .register(fastifyFormbody)
    .register(jsxRenderer)
    .register(helmet, {
      referrerPolicy: {
        policy: 'same-origin',
      },
      contentSecurityPolicy: {
        // If you get stuck in CSP, try this: crossOriginEmbedderPolicy: false,
        directives: {
          'script-src': [
            'http://localhost:35729/',
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
          ],
          'img-src': ['https:', 'data:', 'blob:'],
          'connect-src': ['http:', "'self'", 'ws:'],
          'default-src': ["'self'", 'ws:'],
        },
      },
      hsts: app.config.NODE_ENV === 'production',
    })
    .register(staticServe, {
      root: path.join(__dirname, ASSETS_PATH),
      prefix: `/${ASSETS_MOUNT_POINT}`,
    })
    .register(router)
    .after(() => {
      app.log.info('Database connected');
    });
});

export default () => app;
