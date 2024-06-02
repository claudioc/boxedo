/* eslint-disable @typescript-eslint/no-unsafe-call */
import fp from 'fastify-plugin';
import Polyglot from 'node-polyglot';
import { FastifyInstance, FastifyPluginCallback } from 'fastify';

interface i18nPluginOptions {
  defaultLocale: string;
  locales: Record<string, Record<string, string>>;
}

const i18nPlugin: FastifyPluginCallback<i18nPluginOptions> = (
  fastify: FastifyInstance,
  opts: i18nPluginOptions,
  next: (err?: Error) => void
) => {
  const defaultLocale: string = opts.defaultLocale;
  const locales = opts.locales;

  if (Object.keys(locales).indexOf(defaultLocale) === -1) {
    next(new Error('Default locale not found in locales'));
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const i18n = new Polyglot({
    phrases: locales[defaultLocale],
    locale: defaultLocale,
  });

  fastify.decorate('i18n', i18n);

  next();
};

export default fp(i18nPlugin, {
  name: 'i18n-plugin',
});

export { Polyglot };
