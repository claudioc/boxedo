import fp from 'fastify-plugin';
import Polyglot from 'node-polyglot';
import type { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { replaceReact } from './replaceReact';

interface i18nPluginOptions {
  defaultLocale: string;
  locales: Record<string, string | object>;
}

interface i18nExtended extends Polyglot {
  locales: Record<string, string | object>;
  defaultLocale: string;
  switchTo: (locale: string) => void;
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

  const i18n = new Polyglot({
    phrases: locales[defaultLocale],
    locale: defaultLocale,
    replace: replaceReact,
  });

  const switchTo = (locale: string) => {
    if (Object.keys(locales).indexOf(locale) === -1) {
      throw new Error(`Locale ${locale} not found`);
    }
    i18n.locale(locale);
    i18n.replace(locales[locale]);
  };

  const i18nExtended: i18nExtended = Object.assign(i18n, {
    ...i18n,
    locales,
    defaultLocale,
    switchTo,
  });

  fastify.decorate('i18n', i18nExtended);

  next();
};

export default fp(i18nPlugin, {
  name: 'i18n-plugin',
});

export type { i18nExtended };
