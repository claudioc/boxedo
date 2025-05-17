import { describe, expect, it } from 'vitest';
import { parseBaseUrl } from './helpers';

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
