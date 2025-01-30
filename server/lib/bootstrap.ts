import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import staticServe from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyFavicon from 'fastify-favicon';
import type { PinoLoggerOptions } from 'fastify/types/logger';
import fastifyEnv from '@fastify/env';
import path from 'node:path';
import router from './router';
import {
  ConfigEnvSchema,
  type ConfigEnv,
  type NodeEnv,
  type SettingsModel,
} from '~/../types';
import kitaHtmlPlugin from '@kitajs/fastify-html-plugin';
import { fileURLToPath } from 'node:url';
import csrfProtection from '@fastify/csrf-protection';
import fastifyCookie from '@fastify/cookie';
import { ASSETS_MOUNT_POINT, ASSETS_PATH } from '~/constants';
import { dbService, type DbClient } from '~/services/dbService';
import fastifyI18n, { type i18nExtended } from '~/lib/plugins/i18n';
import fastifyFeedback from '~/lib/plugins/feedback';
import fastifyCache, { type Cache } from '~/lib/plugins/cache';
import multipart from '@fastify/multipart';
import { EmailService } from '~/services/emailService';

import en from '../locales/en.json';
import it from '../locales/it.json';

declare module 'fastify' {
  interface FastifyInstance {
    config: ConfigEnv;
    isDev: boolean;
    settings: SettingsModel;
    dbClient: DbClient;
    i18n: i18nExtended;
    feedbackCode: number;
    cache: Cache;
    emailService: EmailService;
  }
}

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

const emailService = EmailService.getInstance();

await emailService.initialize({
  type: process.env.EMAIL_PROVIDER ?? '',
  apiKey: process.env.EMAIL_API_KEY ?? '',
  domain: process.env.EMAIL_DOMAIN ?? '',
  host: process.env.EMAIL_HOST ?? '',
});

app.decorate('emailService', emailService);

try {
  app.decorate(
    'dbClient',
    await dbService.init({
      serverUrl: process.env.COUCHDB_URL ?? '',
      username: process.env.COUCHDB_USER ?? '',
      password: process.env.COUCHDB_PASSWORD ?? '',
      env: process.env.NODE_ENV as NodeEnv,
    })
  );
} catch {
  throw new Error('Cannot establish a database connection.');
}

if (process.env.NODE_ENV !== 'test') {
  await app.register(csrfProtection);
}

const dbs = await dbService(app.dbClient);
const settings = await dbs.getSettings(app.config);

await app.register(fastifyI18n, {
  defaultLocale: 'en',
  locales: {
    en,
    it,
  },
});
app.i18n.switchTo(settings.siteLang);

app.decorate('settings', settings);
app.decorate('isDev', process.env.NODE_ENV !== 'production');

await app.register(fastifyEnv, { schema: ConfigEnvSchema }).then(() => {
  app
    .register(fastifyCookie)
    .register(fastifyCache)
    .register(multipart)
    .register(fastifyFeedback)
    .register(fastifyFavicon, {
      path: './assets',
      name: 'favicon.ico',
      maxAge: 3600,
    })
    .register(fastifyFormbody)
    .register(kitaHtmlPlugin)
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
          'img-src': ['http:', 'https:', 'data:', 'blob:'],
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
      app.log.info('Application initialized.');
    });
});

export default (isTestRun = false) => {
  // At the moment we use the same server for testing purposes
  // so we need to really be sure that we are not mixing up the environments
  if (
    (isTestRun && app.config.NODE_ENV !== 'test') ||
    (!isTestRun && app.config.NODE_ENV === 'test')
  ) {
    app.log.error('Test run is not set correctly');
    process.exit(1);
  }

  return app;
};
