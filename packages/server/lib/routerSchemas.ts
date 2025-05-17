import { supportedLocales } from 'boxedo-core/locales/phrases';
import { textSizes, type ModelName } from 'boxedo-core/types';
import type { JSONSchema } from 'json-schema-to-ts';

export const IdFormat = (prefix: ModelName) =>
  ({
    type: 'string',
    pattern: `^${prefix}:[0-9a-z]{2,32}$`,
  }) as const;

const buildSchema = <T extends Record<string, JSONSchema>>(
  required: ReadonlyArray<Extract<keyof T, string>>,
  properties: T
) => {
  return {
    type: 'object',
    required,
    properties,
  } as const satisfies JSONSchema;
};

const PageIdFormat = IdFormat('page');
const FileIdFormat = IdFormat('file');
const MagicIdFormat = IdFormat('magic');

export const RouterSchemas = {
  MagicLinkParams: buildSchema(['magicId'], {
    magicId: MagicIdFormat,
  } as const),

  PageSlugParams: buildSchema(['slug'], {
    slug: { type: 'string' },
  } as const),

  PageParams: buildSchema(['pageId'], {
    pageId: PageIdFormat,
  } as const),

  PageParamsOptional: buildSchema([], {
    pageId: {
      anyOf: [PageIdFormat, { type: 'null' }],
    },
  } as const),

  PageWithVersionParams: buildSchema(['pageId', 'version'], {
    pageId: IdFormat('page'),
    version: { type: 'string', pattern: '^[0-9]+-[a-f0-9]+$' },
  } as const),

  UploadParams: buildSchema(['fileId', 'filename'], {
    fileId: FileIdFormat,
    filename: { type: 'string' },
  } as const),

  NavQuery: buildSchema([], {
    disabled: { type: 'boolean', default: false },
  } as const),

  SearchQuery: buildSchema(['q'], {
    q: { type: 'string' },
  } as const),

  CreatePageQuery: buildSchema([], {
    parentPageId: {
      anyOf: [PageIdFormat, { type: 'null' }],
    },
  } as const),

  PageBody: buildSchema(['pageTitle', 'pageContent'], {
    pageTitle: { type: 'string' },
    pageContent: { type: 'string' },
    rev: { type: 'string' },
  } as const),

  MovePageBody: buildSchema(['moveToTop'], {
    newParentId: {
      anyOf: [PageIdFormat, { type: 'null' }],
    },
    moveToTop: { type: 'string', enum: ['true', 'false'] },
  } as const),

  LoginBody: buildSchema(['email'], {
    email: { type: 'string', format: 'email' },
  } as const),

  ReorderPageBody: buildSchema(['targetIndex'], {
    targetIndex: { type: 'integer', minimum: 0 },
  } as const),

  SettingsPageBody: buildSchema(['siteTitle'], {
    landingPageId: {
      anyOf: [PageIdFormat, { type: 'null' }],
    },
    siteTitle: { type: 'string' },
    siteDescription: { type: 'string' },
  } as const),

  PreferencesPageBody: buildSchema(['siteLang'], {
    siteLang: { type: 'string', enum: supportedLocales },
    textSize: { type: 'string', enum: textSizes },
  } as const),
};
