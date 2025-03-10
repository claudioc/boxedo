import { createId } from '@paralleldrive/cuid2';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { err, ok, type Result } from 'neverthrow';
import fs from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import sanitizeHtml from 'sanitize-html';
import {
  ConfigEnvSchema,
  DEFAULT_SUPPORTED_LOCALE,
  languageLocaleMap,
  type ConfigEnv,
  type Feedback,
  type ModelName,
  type TextSize,
  type UrlParts,
} from '../../types';
import { supportedLocales, type SupportedLocales } from '../locales/phrases';
import { stopwords } from '../locales/stopwords.en';

export const slugUrl = (slug: string) =>
  slug === '/' || slug === '' ? '/' : `/view/${slug}`;

export const pathWithFeedback = (path: string, feedback?: Feedback) => {
  if (!feedback) {
    return path;
  }

  return `${path}?f=${feedback.code}`;
};

/**
 * Formats a date string according to the application's language setting
 * @param date ISO date string to format
 * @param locale Application language setting
 * @param def Default value to return if date is empty
 * @returns Formatted date string
 */
export const formatDate = (
  date: string,
  locale: SupportedLocales = DEFAULT_SUPPORTED_LOCALE,
  def = ''
) => {
  if (!date) return def;

  const formattingLocale = languageLocaleMap[locale] || locale;

  return new Intl.DateTimeFormat(formattingLocale, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date));
};

// We want to consider 10ms of difference as the same timestamp
export const isSameTimestamp = (date1: string, date2: string) => {
  return Math.abs(new Date(date1).getTime() - new Date(date2).getTime()) < 10;
};

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

export const parseBaseUrl = (baseUrl: string | undefined): UrlParts | null => {
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
      return null;
    }
  }

  return null;
};

const parsePort = (input: string | undefined): number | undefined => {
  if (!input?.trim()) return;
  const port = Number.parseInt(input.trim(), 10);
  return Number.isNaN(port) ? undefined : port;
};

export const ensureValidLanguage = (candidate: string) =>
  (supportedLocales.includes(candidate as SupportedLocales)
    ? candidate
    : DEFAULT_SUPPORTED_LOCALE) as SupportedLocales;

export const getDefaultLanguage = (
  config: ConfigEnv | undefined
): SupportedLocales => {
  if (!config) {
    return DEFAULT_SUPPORTED_LOCALE;
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

export const compressTextForSearch = (
  html: string,
  stopWords: Set<string> = stopwords
): string =>
  // We also have cheerio available for html stripping but regexp are faster
  // and it's OK if they are inaccurate
  html
    .replace(/<[^>]*>/g, ' ') // Replace tags with space
    .replace(/&nbsp;/g, ' ') // Replace &nbsp;
    .replace(/&[a-z]+;/g, ' ') // Replace other entities
    .toLowerCase() // Convert to lowercase
    .replace(/[\s\n\r\t]+/g, ' ') // Normalize whitespace
    .split(' ')
    .filter(
      (word) =>
        word.length > 2 && // Keep only words longer than 2 chars
        !stopWords.has(word) && // Remove stop words
        !/^\d+$/.test(word) // Remove pure number words
    )
    .join(' ')
    .trim();

// This is inspired by Datasette's quote_fts() function ported to js and used in search
export const prepareFTSQuery = (
  query: string,
  stopWords: Set<string> = stopwords
): string => {
  let escaped = query.trim().replace(/\s+/g, ' ');

  const wasQuoted = escaped.startsWith('"') && escaped.endsWith('"');

  // Quoted queries normalization are more relaxed, matching the intent of the user "I know what I am doing"
  if (!wasQuoted) {
    escaped = escaped.replace(/\b(or|and|not)\b/gi, (match) =>
      match.toUpperCase()
    );

    escaped = escaped
      .replace(/[\^|/\\'\[\](){}]/g, ' ') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize whitespace again
      .split(' ')
      .filter(
        (word) =>
          !stopWords.has(word) ||
          ['and', 'or', 'not'].includes(word.toLowerCase())
      )
      .join(' ')
      .trim();

    // Check for boolean-only query first (would raise an error)
    if (/^(AND|OR|NOT)$/i.test(escaped)) {
      return '';
    }

    escaped = escaped
      .replace(/^(?:AND|OR|NOT)\s+/gi, '') // Remove single boolean at start
      .replace(/^(?:AND|OR|NOT\s+)+/gi, '') // Handle multiple booleans at start
      .replace(/\s+(?:AND|OR|NOT)$/gi, '') // Remove single boolean at end
      .replace(/(?:\s+(?:AND|OR|NOT))+$/gi, ''); // Handle multiple booleans at end
  }

  // Look for unbalanced quotes
  if ((escaped.match(/"/g) || []).length % 2) {
    escaped += '"';
  }

  escaped = escaped.replace(/"/g, '""');

  return escaped;
};

// We use our own highlighter because sqlite FTS cannot highlight fields
// that are not indexed and we want to index the full title with the stopwords
// because we use it to display the results
export const highlightPhrase = (
  query: string,
  title: string,
  stopWords: Set<string> = stopwords
): string => {
  // Normalize the query: remove special characters and split into words
  const queryWords = prepareFTSQuery(query)
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .split(/\s+/) // Split on whitespace
    .map((word) => word.replace(/[^a-z0-9]/gi, '')) // Only keep alphanumeric chars
    .filter((word) => !stopWords.has(word) && word.length > 0);

  if (queryWords.length === 0) {
    return title;
  }

  // Create a regex pattern that matches any of the query words
  const pattern = new RegExp(`\\b(${queryWords.join('|')})\\b`, 'gi');

  // Replace matches with marked version
  return title.replace(pattern, '<mark>$1</mark>');
};

export const ensurePathExists = async (
  path: string,
  description: string
): Promise<Result<void, Error>> => {
  try {
    await access(path, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    try {
      await mkdir(path, { recursive: true });
    } catch (error) {
      return err(
        new Error(
          `Failed to create ${description} at ${path}: ${(error as Error).message}`
        )
      );
    }
  }

  return ok();
};

export const nop = () => {};

// https://github.com/apostrophecms/sanitize-html
export const safeHtml = (str: string) =>
  sanitizeHtml(str, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      a: ['href', 'rel', 'target'],
      img: [
        'src',
        'srcset',
        'alt',
        'title',
        'width',
        'height',
        'loading',
        'class',
        'style',
        // Used by tiptap Image extension
        'data-alignment',
      ],
      table: ['class'],
      tbody: ['class'],
      th: ['class'],
      tr: ['class'],
      td: ['class'],
    },
  });

export const generateIdFor = (model: ModelName) => `${model}:${createId()}`;

export const mapTextSize = (size: TextSize) => {
  switch (size) {
    case 'S':
      return 'text-sm';
    case 'M':
      return 'text-base';
    case 'L':
      return 'text-lg';
    case 'XL':
      return 'text-xl';
  }
};

export const isHomePage = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname;
    // Check if path is either '/' or empty
    return path === '/' || path === '';
  } catch {
    // If URL parsing fails, return false
    return false;
  }
};
