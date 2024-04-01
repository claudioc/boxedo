/* eslint-disable @typescript-eslint/ban-ts-comment */
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import staticServe from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyFavicon from 'fastify-favicon';
import mongodb from '@fastify/mongodb';
import path from 'path';
import router from './router';
import { ASSETS_MOUNT_POINT, ASSETS_PATH } from '../constants';
import { PinoLoggerOptions } from 'fastify/types/logger';
import { NodeEnv } from '../types';
import fastifyEnv from '@fastify/env';
import jsxRenderer from './jsxRenderer';
import { FromSchema } from 'json-schema-to-ts';
import { fileURLToPath } from 'url';
import fastifyUUID from 'fastify-uuid';
import { MongoMemoryServer } from 'mongodb-memory-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix thread-stream error due to __dirname in pino
if (process.env.NODE_ENV !== 'test') {
  // @ts-ignore
  globalThis.__bundlerPathsOverrides = {
    'thread-stream-worker': path.join(
      // @ts-ignore
      path.dirname(createRequire(import.meta.url).resolve('thread-stream')),
      'lib',
      'worker.js'
    ),
  };
}

let mongodbServerUri: string | undefined;
if (process.env.NODE_ENV === 'test') {
  mongodbServerUri = (await MongoMemoryServer.create()).getUri();
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
  }
}

const envToLogger: Record<NodeEnv, PinoLoggerOptions | boolean> = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        ignore:
          'pid,res,responseTime,req.remoteAddress,req.remotePort,req.hostname',
      },
    },
  },
  production: true,
  test: false,
};

const app = Fastify({
  logger:
    envToLogger[(process.env.NODE_ENV as NodeEnv) || 'development'] ?? true,
});

app.register(fastifyUUID);

app.register(fastifyEnv, { schema: ConfigEnvSchema }).then(() => {
  app
    .register(mongodb, {
      forceClose: true,
      url: mongodbServerUri ?? app.config.MONGO_URL,
    })
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
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
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
