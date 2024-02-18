import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import staticServe from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyFavicon from 'fastify-favicon';
import mongodb from '@fastify/mongodb';
import path from 'path';
import router from './router';
import { ASSETS_MOUNT_POINT, ASSETS_PATH } from './constants.js';
import { PinoLoggerOptions } from 'fastify/types/logger';
import { NodeEnv } from '../types';
import fastifyEnv from '@fastify/env';
import jsxRenderer from './jsxRenderer';
import { FromSchema } from 'json-schema-to-ts';
import { config } from 'process';

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
};

const app = Fastify({
  logger:
    envToLogger[(process.env.NODE_ENV as NodeEnv) || 'development'] ?? true,
});

app.register(fastifyEnv, { schema: ConfigEnvSchema }).then(() => {
  app
    .register(mongodb, {
      forceClose: true,
      url: app.config.MONGO_URL,
    })
    .register(fastifyFavicon, {
      path: './assets',
      name: 'favicon.ico',
      maxAge: 3600,
    })
    .register(fastifyFormbody)
    .register(jsxRenderer)
    .register(helmet, {
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
