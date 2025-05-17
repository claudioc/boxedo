import type { SupportedLocales } from 'boxedo-core/locales/phrases';
import type { FastifyInstance, FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import Polyglot from 'node-polyglot';
import { replaceReact } from './replaceReact';

interface i18nPluginOptions {
  defaultLocale: SupportedLocales;
  phrases: Record<SupportedLocales, string | object>;
}

interface i18nExtended extends Polyglot {
  locales: Record<SupportedLocales, string | object>;
  defaultLocale: SupportedLocales;
  switchTo: (locale: SupportedLocales) => void;
}

const i18nPlugin: FastifyPluginCallback<i18nPluginOptions> = (
  fastify: FastifyInstance,
  opts: i18nPluginOptions,
  next: (err?: Error) => void
) => {
  const defaultLocale: SupportedLocales = opts.defaultLocale;
  const phrases = opts.phrases;

  if (Object.keys(phrases).indexOf(defaultLocale) === -1) {
    next(new Error('Default locale not found in locales'));
    return;
  }

  const i18n = new Polyglot({
    phrases: phrases[defaultLocale],
    locale: defaultLocale,
    replace: replaceReact,
  });

  const switchTo = (locale: SupportedLocales) => {
    if (Object.keys(phrases).indexOf(locale) === -1) {
      throw new Error(`Locale ${locale} not found`);
    }
    i18n.locale(locale);
    i18n.replace(phrases[locale]);
  };

  const i18nExtended: i18nExtended = Object.assign(i18n, {
    ...i18n,
    locales: phrases,
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
