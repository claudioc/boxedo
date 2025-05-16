import { describe, expect, it } from 'vitest';
import type { ConfigEnv } from '~/../types';
import {
  compressTextForSearch,
  extractFileRefsFrom,
  formatDate,
  getDefaultLanguage,
  highlightPhrase,
  isSameTimestamp,
  loadConfig,
  parseBaseUrl,
  pathWithFeedback,
  prepareFTSQuery,
} from './helpers';

import { IdFormat } from './routerSchemas';

// Simple list of stopwords, not the real one
const stopwords = new Set([
  'the',
  'and',
  'or',
  'but',
  'is',
  'on',
  'in',
  'to',
  'it',
]);

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
    expect(formatDate('', 'en', 'N/A')).toBe('N/A');
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
      pathname: '/',
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
      pathname: '/',
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
      pathname: '/some/path',
    });
  });

  it('identifies localhost correctly', () => {
    const result = parseBaseUrl('http://localhost:3000');
    expect(result?.isLocalhost).toBe(true);

    const result2 = parseBaseUrl('http://127.0.0.1:3000');
    expect(result2?.isLocalhost).toBe(true);
  });

  it('returns undefined for empty input', () => {
    expect(parseBaseUrl('')).toBeNull();
    expect(parseBaseUrl(undefined)).toBeNull();
    expect(parseBaseUrl('not-a-url')).toBeNull();
    expect(parseBaseUrl('http://')).toBeNull();
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

  it('should return "en" when config has no BXD_SETTINGS_LANGUAGE', () => {
    const config = {} as ConfigEnv;
    const result = getDefaultLanguage(config);
    expect(result).toBe('en');
  });

  it('should return the configured language when it is supported', () => {
    const config = {
      BXD_SETTINGS_LANGUAGE: 'it',
    } as ConfigEnv;
    const result = getDefaultLanguage(config);
    expect(result).toBe('it');
  });

  it('should return "en" when configured language is not supported', () => {
    const config = {
      BXD_SETTINGS_LANGUAGE: 'bazooka', // assuming 'fr' is not in supportedLocales
    } as ConfigEnv;
    const result = getDefaultLanguage(config);
    expect(result).toBe('en');
  });

  it('should return "en" when BXD_SETTINGS_LANGUAGE is empty string', () => {
    const config = {
      BXD_SETTINGS_LANGUAGE: '',
    } as ConfigEnv;
    const result = getDefaultLanguage(config);
    expect(result).toBe('en');
  });
});

describe('compressTextForSearch', () => {
  it('removes HTML tags', () => {
    const input = '<p>Hello <b>World</b>!</p>';
    expect(compressTextForSearch(input, stopwords)).toBe('hello world');
  });

  it('replaces common HTML entities', () => {
    const input = 'Hello&nbsp;World &amp; Universe';
    expect(compressTextForSearch(input, stopwords)).toBe(
      'hello world universe'
    );
  });

  it('converts text to lowercase', () => {
    const input = 'HeLLo WoRLD';
    expect(compressTextForSearch(input, stopwords)).toBe('hello world');
  });

  it('removes multiple spaces and new lines', () => {
    const input = 'Hello    World \n\n This\tis  a test';
    expect(compressTextForSearch(input, stopwords)).toBe(
      'hello world this test'
    );
  });

  it('removes words shorter than 3 characters', () => {
    const input = 'I am an AI system';
    expect(compressTextForSearch(input, stopwords)).toBe('system');
  });

  it('removes stopwords', () => {
    const input = 'The quick brown fox jumps over the lazy dog';
    expect(compressTextForSearch(input, stopwords)).toBe(
      'quick brown fox jumps over lazy dog'
    );
  });

  it('removes numbers', () => {
    const input = 'This is a test 123 with numbers 456';
    expect(compressTextForSearch(input, stopwords)).toBe(
      'this test with numbers'
    );
  });

  it('handles empty input', () => {
    expect(compressTextForSearch('', stopwords)).toBe('');
  });

  it('handles input with only HTML tags', () => {
    expect(compressTextForSearch('<div></div><p></p>', stopwords)).toBe('');
  });

  it('handles input with only numbers and short words', () => {
    expect(compressTextForSearch('12 34 a bc', stopwords)).toBe('');
  });

  it('keeps non-stop words and valid words', () => {
    const input = 'Artificial Intelligence (AI) is amazing!';
    expect(compressTextForSearch(input, stopwords)).toBe(
      'artificial intelligence (ai) amazing!'
    );
  });
});

describe('prepareFTSQuery', () => {
  it('trims leading and trailing spaces', () => {
    expect(prepareFTSQuery('  hello world  ', stopwords)).toBe('hello world');
  });

  it('normalizes multiple spaces', () => {
    expect(prepareFTSQuery('hello     world', stopwords)).toBe('hello world');
  });

  it('converts boolean operators to uppercase', () => {
    expect(prepareFTSQuery('hello or world', stopwords)).toBe('hello OR world');
    expect(prepareFTSQuery('hello and world', stopwords)).toBe(
      'hello AND world'
    );
    expect(prepareFTSQuery('hello not world', stopwords)).toBe(
      'hello NOT world'
    );
  });

  it('removes special characters', () => {
    expect(prepareFTSQuery('hello ^world', stopwords)).toBe('hello world');
    expect(prepareFTSQuery("hello /world's [test]", stopwords)).toBe(
      'hello world s test'
    );
  });

  it('handles quoted queries (keeps original intent)', () => {
    expect(prepareFTSQuery('"hello world"', stopwords)).toBe('""hello world""');
  });

  it('fixes unbalanced quotes by adding a closing quote', () => {
    expect(prepareFTSQuery('"hello world', stopwords)).toBe('""hello world""');
  });

  it('escapes existing quotes by doubling them', () => {
    expect(prepareFTSQuery('"hello "world""', stopwords)).toBe(
      '""hello ""world""""'
    );
  });

  it('prevents boolean-only queries', () => {
    expect(prepareFTSQuery('AND', stopwords)).toBe('');
    expect(prepareFTSQuery('OR', stopwords)).toBe('');
    expect(prepareFTSQuery('NOT', stopwords)).toBe('');
  });

  it('handles mixed boolean operators with other words', () => {
    expect(prepareFTSQuery('hello OR NOT world', stopwords)).toBe(
      'hello OR NOT world'
    );
  });

  it('handles boolean operators at the beginning', () => {
    expect(prepareFTSQuery('OR NOT world', stopwords)).toBe('world');
  });

  it('handles boolean operators at the beginning', () => {
    expect(prepareFTSQuery('something that OR NOT', stopwords)).toBe(
      'something that'
    );
  });

  it('handles empty query gracefully', () => {
    expect(prepareFTSQuery('', stopwords)).toBe('');
  });

  it('handles special characters only (should be empty)', () => {
    expect(prepareFTSQuery('^ / \\ [ ] ( ) { }', stopwords)).toBe('');
  });

  it('does not modify correctly formatted queries', () => {
    expect(prepareFTSQuery('"this is a test" AND world', stopwords)).toBe(
      '""this a test"" AND world'
    );
  });

  it('does not allow unbalanced single quote at the end', () => {
    expect(prepareFTSQuery("hello world'", stopwords)).toBe('hello world');
  });
});

describe('highlightPhrase', () => {
  it('should highlight a single word match', () => {
    const result = highlightPhrase(
      'test',
      'This is a test sentence',
      stopwords
    );
    expect(result).toBe('This is a <mark>test</mark> sentence');
  });

  it('should highlight multiple occurrences of the same word', () => {
    const result = highlightPhrase(
      'test',
      'test this test that test',
      stopwords
    );
    expect(result).toBe(
      '<mark>test</mark> this <mark>test</mark> that <mark>test</mark>'
    );
  });

  it('should highlight multiple different words from query', () => {
    const result = highlightPhrase(
      'quick brown',
      'The quick brown fox',
      stopwords
    );
    expect(result).toBe('The <mark>quick</mark> <mark>brown</mark> fox');
  });

  // Case sensitivity tests
  it('should match case-insensitively', () => {
    const result = highlightPhrase(
      'TEST',
      'This is a test sentence',
      stopwords
    );
    expect(result).toBe('This is a <mark>test</mark> sentence');
  });

  it('should preserve original case in output', () => {
    const result = highlightPhrase(
      'test',
      'This is a TEST sentence',
      stopwords
    );
    expect(result).toBe('This is a <mark>TEST</mark> sentence');
  });

  // Special characters and whitespace tests
  it('should handle special characters in query', () => {
    const result = highlightPhrase(
      'test!@#$%',
      'This is a test sentence',
      stopwords
    );
    expect(result).toBe('This is a <mark>test</mark> sentence');
  });

  it('should handle multiple whitespace in query', () => {
    const result = highlightPhrase(
      'quick    brown',
      'The quick brown fox',
      stopwords
    );
    expect(result).toBe('The <mark>quick</mark> <mark>brown</mark> fox');
  });

  // Stopword tests
  it('should ignore stopwords in query', () => {
    const result = highlightPhrase(
      'the quick and brown',
      'The quick brown fox',
      stopwords
    );
    expect(result).toBe('The <mark>quick</mark> <mark>brown</mark> fox');
  });

  // Edge cases
  it('should return original title for empty query', () => {
    const result = highlightPhrase('', 'Test title', stopwords);
    expect(result).toBe('Test title');
  });

  it('should return original title for query with only stopwords', () => {
    const result = highlightPhrase('the and or', 'Test title', stopwords);
    expect(result).toBe('Test title');
  });

  it('should handle empty title', () => {
    const result = highlightPhrase('test', '', stopwords);
    expect(result).toBe('');
  });

  it('should handle whitespace-only title', () => {
    const result = highlightPhrase('test', '   ', stopwords);
    expect(result).toBe('   ');
  });

  // Partial word matching tests
  it('should not highlight partial word matches', () => {
    const result = highlightPhrase('cat', 'The category is animals', stopwords);
    expect(result).toBe('The category is animals');
  });

  // Multiple word boundary tests
  it('should handle word boundaries correctly', () => {
    const result = highlightPhrase(
      'test',
      'testing test tested tests',
      stopwords
    );
    expect(result).toBe('testing <mark>test</mark> tested tests');
  });

  // Special HTML cases
  it('should handle titles containing HTML', () => {
    const result = highlightPhrase('test', '<p>This is a test</p>', stopwords);
    expect(result).toBe('<p>This is a <mark>test</mark></p>');
  });

  it('should escape HTML in query terms', () => {
    const result = highlightPhrase(
      '<script>test</script>',
      'This is a test',
      stopwords
    );
    expect(result).toBe('This is a <mark>test</mark>');
  });

  // Performance edge cases
  it('should handle long titles efficiently', () => {
    const longTitle = 'test '.repeat(1000).trim();
    const result = highlightPhrase('test', longTitle, stopwords);
    expect(result).toBe('<mark>test</mark> '.repeat(1000).trim());
  });

  it('should handle long queries efficiently', () => {
    const longQuery = 'test '.repeat(100);
    const result = highlightPhrase(longQuery, 'This is a test sentence');
    expect(result).toBe('This is a <mark>test</mark> sentence');
  });
});

describe('loadConfig', () => {
  it('should load and validate a passed config', () => {
    const source = {
      BXD_AUTHENTICATION_TYPE: 'none',
      BXD_DB_BACKEND: 'remote',
      UNKNOWN_KEY: 'value',
    };
    const config = loadConfig(source);
    expect(config.BXD_AUTHENTICATION_TYPE).toBe('none');
    expect(config.BXD_DB_BACKEND).toBe('remote');
    expect(config.BXD_EMAIL_PROVIDER).toBe('dummy');
    // @ts-ignore
    expect(config.UNKNOWN_KEY).toBe(undefined);
  });
});
