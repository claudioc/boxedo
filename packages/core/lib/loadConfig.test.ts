import { describe, expect, it } from 'vitest';
import { loadConfig } from './loadConfig';

describe('loadConfig', () => {
  it('should throw if the source is weird', () => {
    expect(() => {
      loadConfig({ lol: 'wut' });
    }).toThrow();
  });

  it('should throw if the source is invalid', () => {
    expect(() => {
      loadConfig({ BXD_AUTHENTICATION_TYPE: 'bazinga' });
    }).toThrow();
  });

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
