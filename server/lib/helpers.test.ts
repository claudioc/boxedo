import { describe, it, expect } from 'vitest';
import {
  slugUrl,
  pathWithFeedback,
  formatDate,
  isSameTimestamp,
  isTopLevelPage,
  extractFileRefsFrom,
  parseBaseUrl,
  getDefaultLanguage,
} from './helpers';
import type { ConfigEnv } from '~/../types';

import { IdFormat } from './routerSchemas';

describe('slugUrl', () => {
  it('returns / for empty and root slug', () => {
    expect(slugUrl('')).toBe('/');
    expect(slugUrl('/')).toBe('/');
  });

  it('returns /view/slug for normal slug', () => {
    expect(slugUrl('about')).toBe('/view/about');
    expect(slugUrl('some-page')).toBe('/view/some-page');
  });
});

describe('pathWithFeedback', () => {
  it('returns original path when no feedback provided', () => {
    expect(pathWithFeedback('/some/path')).toBe('/some/path');
  });

  it('appends feedback code when feedback provided', () => {
    const feedback = { code: 123, message: 'test' };
    expect(pathWithFeedback('/some/path', feedback)).toBe('/some/path?f=123');
  });
});

describe('formatDate', () => {
  it('returns default value for empty date', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate('', 'N/A')).toBe('N/A');
  });

  it('formats date correctly', () => {
    const date = '2024-02-01T15:30:00Z';
    const formatted = formatDate(date);
    // Note: exact format may vary by locale, so we test for presence of key parts
    expect(formatted).toContain('01/02/2024');
    expect(formatted).toContain('16:30');
  });
});

describe('isSameTimestamp', () => {
  it('considers timestamps within 10ms as same', () => {
    const date1 = '2024-02-01T15:30:00.000Z';
    const date2 = '2024-02-01T15:30:00.009Z';
    expect(isSameTimestamp(date1, date2)).toBe(true);
  });

  it('considers timestamps more than 10ms apart as different', () => {
    const date1 = '2024-02-01T15:30:00.000Z';
    const date2 = '2024-02-01T15:30:00.011Z';
    expect(isSameTimestamp(date1, date2)).toBe(false);
  });
});

describe('isTopLevelPage', () => {
  it('returns true for pages without parentId', () => {
    // biome-ignore lint/suspicious/noExplicitAny:
    const page = { parentId: null } as any;
    expect(isTopLevelPage(page)).toBe(true);
  });

  it('returns false for pages with parentId', () => {
    // biome-ignore lint/suspicious/noExplicitAny:
    const page = { parentId: 'page:123' } as any;
    expect(isTopLevelPage(page)).toBe(false);
  });
});

describe('extractFileRefsFrom', () => {
  it('extracts file IDs from upload URLs', () => {
    const content = `
      <img src="/uploads/file:123/image.jpg" />
      <img src="/uploads/file:456/other.png" />
      Some text
      <img src="/uploads/file:789/last.gif" />
    `;
    const refs = extractFileRefsFrom(content);
    expect(refs.size).toBe(3);
    expect(refs.has('file:123')).toBe(true);
    expect(refs.has('file:456')).toBe(true);
    expect(refs.has('file:789')).toBe(true);
  });

  it('returns empty set for content without file references', () => {
    const content = '<p>Just some text</p>';
    const refs = extractFileRefsFrom(content);
    expect(refs.size).toBe(0);
  });

  it('handles malformed URLs correctly', () => {
    const content = `
      <img src="https://" />
      <img src="" />
      <img src="/booo/s" />
      <img src="/uploads" />
      <img src="/uploads/" />
      <img src="/uploads/not-a-file/bad.jpg" />
      <img src="/uploads//bad.jpg" />
      <img src="/uploads/file:123/good.jpg" />
      <img src="/uploads/file:/bad.jpg" />
      <img src="/uploads/file:123/" />
    `;
    const refs = extractFileRefsFrom(content);
    expect(refs.size).toBe(1);
    expect(refs.has('file:123')).toBe(true);
  });
});

describe('parseBaseUrl', () => {
  it('parses valid HTTP URL', () => {
    const result = parseBaseUrl('http://example.com:8080');
    expect(result).toEqual({
      protocol: 'http',
      hostname: 'example.com',
      port: 8080,
      baseUrl: 'http://example.com:8080',
      host: 'example.com:8080',
      isLocalhost: false,
    });
  });

  it('parses valid HTTPS URL', () => {
    const result = parseBaseUrl('https://example.com');
    expect(result).toEqual({
      protocol: 'https',
      hostname: 'example.com',
      port: 443,
      baseUrl: 'https://example.com',
      host: 'example.com',
      isLocalhost: false,
    });
  });

  it('parses valid HTTPS URL with a path', () => {
    const result = parseBaseUrl('https://example.com/some/path');
    expect(result).toEqual({
      protocol: 'https',
      hostname: 'example.com',
      port: 443,
      baseUrl: 'https://example.com/some/path',
      host: 'example.com',
      isLocalhost: false,
    });
  });

  it('identifies localhost correctly', () => {
    const result = parseBaseUrl('http://localhost:3000');
    expect(result?.isLocalhost).toBe(true);

    const result2 = parseBaseUrl('http://127.0.0.1:3000');
    expect(result2?.isLocalhost).toBe(true);
  });

  it('returns undefined for empty input', () => {
    expect(parseBaseUrl('')).toBeUndefined();
    expect(parseBaseUrl(undefined)).toBeUndefined();
  });

  it('throws error for invalid URL', () => {
    expect(() => parseBaseUrl('not-a-url')).toThrow('Invalid base URL');
    expect(() => parseBaseUrl('http://')).toThrow('Invalid base URL');
  });
});

describe('IdFormat', () => {
  it('creates correct schema for given prefix', () => {
    const schema = IdFormat('page');
    expect(schema.type).toBe('string');
    expect(schema.pattern).toBe('^page:[0-9a-z]{2,32}$');
  });

  it('validates correct ID format', () => {
    const schema = IdFormat('page');
    const regex = new RegExp(schema.pattern);

    expect(regex.test('page:123abc')).toBe(true);
    expect(regex.test('page:12')).toBe(true);
    expect(regex.test('page:123456789abcdef')).toBe(true);
  });

  it('rejects invalid ID formats', () => {
    const schema = IdFormat('page');
    const regex = new RegExp(schema.pattern);

    expect(regex.test('page:')).toBe(false);
    expect(regex.test('page:A123')).toBe(false);
    expect(regex.test('page:123.')).toBe(false);
    expect(regex.test('wrong:123')).toBe(false);
    expect(regex.test('page:a')).toBe(false);
    expect(regex.test(`page:${'a'.repeat(33)}`)).toBe(false);
  });
});

describe('getDefaultLanguage', () => {
  it('should return "en" when config is undefined', () => {
    const result = getDefaultLanguage(undefined);
    expect(result).toBe('en');
  });

  it('should return "en" when config has no SETTINGS_LANGUAGE', () => {
    const config = {} as ConfigEnv;
    const result = getDefaultLanguage(config);
    expect(result).toBe('en');
  });

  it('should return the configured language when it is supported', () => {
    const config = {
      SETTINGS_LANGUAGE: 'it',
    } as ConfigEnv;
    const result = getDefaultLanguage(config);
    expect(result).toBe('it');
  });

  it('should return "en" when configured language is not supported', () => {
    const config = {
      SETTINGS_LANGUAGE: 'bazooka', // assuming 'fr' is not in supportedLocales
    } as ConfigEnv;
    const result = getDefaultLanguage(config);
    expect(result).toBe('en');
  });

  it('should return "en" when SETTINGS_LANGUAGE is empty string', () => {
    const config = {
      SETTINGS_LANGUAGE: '',
    } as ConfigEnv;
    const result = getDefaultLanguage(config);
    expect(result).toBe('en');
  });
});
