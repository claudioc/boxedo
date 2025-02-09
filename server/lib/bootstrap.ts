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
  type UserModel,
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
import { phrases, type SupportedLocales } from '../locales/phrases';
import { syncUsers } from './syncUsers';

declare module 'fastify' {
  interface FastifyInstance {
    // The config is automatically loaded by the fastifyEnv plugin
    // and validated against the schema defined in types
    config: ConfigEnv;
    is: (env: NodeEnv) => boolean;
    settings: SettingsModel;
    dbClient: DbClient;
    i18n: i18nExtended;
    feedbackCode: number;
    cache: Cache;
    emailService: EmailService;
  }
  interface FastifyRequest {
    user: UserModel | null;
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

if (process.env.NODE_ENV !== 'production') {
  // Do not log assets requests
  app.addHook('onRoute', (opts) => {
    if (opts.path.includes('/a/')) {
      opts.logLevel = 'silent';
    }
  });
}

await app.register(fastifyEnv, { schema: ConfigEnvSchema });

const emailService = EmailService.getInstance();

await emailService.initialize({
  type: app.config.EMAIL_PROVIDER ?? '',
  apiKey: app.config.EMAIL_API_KEY ?? '',
  domain: app.config.EMAIL_DOMAIN ?? '',
  host: app.config.EMAIL_HOST ?? '',
});

app.decorate('emailService', emailService);

try {
  app.decorate(
    'dbClient',
    await dbService.init({
      serverUrl: app.config.COUCHDB_URL ?? '',
      username: app.config.COUCHDB_USER ?? '',
      password: app.config.COUCHDB_PASSWORD ?? '',
      env: app.config.NODE_ENV,
    })
  );
} catch {
  throw new Error('Cannot establish a database connection.');
}

if (app.config.NODE_ENV !== 'test') {
  await app.register(csrfProtection);
}

const dbs = await dbService(app.dbClient);
const settings = await dbs.getSettings();

if (app.config.AUTHENTICATION_TYPE !== 'none') {
  await syncUsers(app, dbs, {
    dryRun: app.config.NODE_ENV === 'test',
  });
}

await app.register(fastifyI18n, {
  defaultLocale: settings.siteLang as SupportedLocales,
  phrases,
});
app.i18n.switchTo(settings.siteLang as SupportedLocales);

app.decorate('settings', settings);
app.decorate('is', (env: NodeEnv) => env === app.config.NODE_ENV);

await app
  .register(fastifyCookie, {
    hook: 'onRequest',
  })
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
