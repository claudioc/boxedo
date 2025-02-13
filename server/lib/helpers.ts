import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  ConfigEnvSchema,
  DEFAULT_SUPPORTED_LANGUAGE,
  type ConfigEnv,
  type Feedback,
  type PageModel,
  type UrlParts,
} from '../../types';
import { supportedLocales, type SupportedLocales } from '../locales/phrases';

export const slugUrl = (slug: string) =>
  slug === '/' || slug === '' ? '/' : `/view/${slug}`;

export const pathWithFeedback = (path: string, feedback?: Feedback) => {
  if (!feedback) {
    return path;
  }

  return `${path}?f=${feedback.code}`;
};

export const formatDate = (date: string, def = '') => {
  if (!date) return def;

  // FIXME this needs to be rethought according to the locale configuration
  return new Intl.DateTimeFormat('en-UK', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date));
};

// We want to consider 10ms of difference as the same timestamp
export const isSameTimestamp = (date1: string, date2: string) => {
  return Math.abs(new Date(date1).getTime() - new Date(date2).getTime()) < 10;
};

export const isTopLevelPage = (page: PageModel) =>
  typeof page.parentId !== 'string';

export const extractFileRefsFrom = (content: string) => {
  // Match URLs like /uploads/file:123/image.jpg - require both file: prefix and a following filename
  const fileUrlPattern = /\/uploads\/(?:file:([0-9a-z]{2,32}))\/[^\"'\s]+/g;
  const fileRefs = new Set<string>();

  let match: RegExpExecArray | null;
  while (true) {
    match = fileUrlPattern.exec(content);
    if (match === null) break;
    if (match[1]) {
      // Only add if we captured the file ID
      fileRefs.add(`file:${match[1]}`);
    }
  }

  return fileRefs;
};

export const parseBaseUrl = (
  baseUrl: string | undefined
): UrlParts | undefined => {
  const trimmed = baseUrl ? baseUrl.trim() : '';

  try {
    const url = new URL(trimmed);

    return {
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      port: parsePort(url.port) ?? (url.protocol === 'https:' ? 443 : 80),
      baseUrl: trimmed,
      host: url.host,
      isLocalhost: url.hostname === 'localhost' || url.hostname === '127.0.0.1',
    } as UrlParts;
  } catch {
    if (trimmed !== '') {
      throw new Error(`Invalid base URL: ${baseUrl}`);
    }
  }
};

const parsePort = (input: string | undefined): number | undefined => {
  if (!input?.trim()) return;
  const port = Number.parseInt(input.trim(), 10);
  return Number.isNaN(port) ? undefined : port;
};

export const ensureValidLanguage = (candidate: string) =>
  (supportedLocales.includes(candidate)
    ? candidate
    : DEFAULT_SUPPORTED_LANGUAGE) as SupportedLocales;

export const getDefaultLanguage = (
  config: ConfigEnv | undefined
): SupportedLocales => {
  if (!config) {
    return DEFAULT_SUPPORTED_LANGUAGE;
  }

  const candidate = config.SETTINGS_LANGUAGE;

  return ensureValidLanguage(candidate);
};

// This helper is for the tasks that need to validate and load the config
// but don't have access to Fastify (which does it automatically via a plugin)
export const loadConfig = (): ConfigEnv => {
  const ajv = new Ajv({
    useDefaults: true,
    removeAdditional: true, // or 'all' or 'failing'
  });
  addFormats(ajv);

  const validate = ajv.compile(ConfigEnvSchema);
  const config = process.env;

  if (!validate(config)) {
    throw new Error(
      `Config validation failed: ${JSON.stringify(validate.errors)}`
    );
  }

  return config as unknown as ConfigEnv;
};
