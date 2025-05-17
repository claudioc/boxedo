import type { ConfigEnv } from 'boxedo-core/types';
import { describe, expect, it } from 'vitest';
import { UrlService } from './UrlService';

UrlService.create({
  BXD_BASE_EXTERNAL_URL: 'http://go.com',
} as ConfigEnv);

const urlService = UrlService.getInstance();

describe('slugUrl', () => {
  it('returns / for empty and root slug', () => {
    expect(urlService.slugUrl('')).toBe('/');
    expect(urlService.slugUrl('/')).toBe('/');
  });

  it('returns /view/slug for normal slug', () => {
    expect(urlService.slugUrl('about')).toBe('/view/about');
    expect(urlService.slugUrl('some-page')).toBe('/view/some-page');
  });

  it('returns /view/slug for normal slug with a base url', () => {
    expect(urlService.slugUrl('about', 'http://go.com/pazienza')).toBe(
      '/pazienza/view/about'
    );
  });
});

describe('urlify', () => {
  it('handles empty parameters', () => {
    let res = urlService.urlify('', '');
    expect(res).toBe('/');
    res = urlService.urlify('', '', true);
    expect(res).toBe('/');
  });

  it('handles bad parameters', () => {
    const res = urlService.urlify('/boom', 'flock32');
    expect(res).toBe('/boom');
  });

  it('handles funny slashes', () => {
    let res = urlService.urlify('////boom', 'flock32');
    expect(res).toBe('/boom');
    res = urlService.urlify('//     //boom//bazinga //', 'flock32');
    expect(res).toBe('/boom/bazinga');
    res = urlService.urlify('//     //boom is great//bazinga //', 'flock32');
    expect(res).toBe('/boom is great/bazinga');
    res = urlService.urlify('join//     //boom//bazinga //    ', 'flock32');
    expect(res).toBe('/join/boom/bazinga');
  });

  it('handles a simple /', () => {
    const res = urlService.urlify('/', '');
    expect(res).toBe('/');
  });

  it('handles a simple base url', () => {
    let res = urlService.urlify('/', 'http://go.com');
    expect(res).toBe('/');
    res = urlService.urlify('/', 'http://go.com/');
    expect(res).toBe('/');
    res = urlService.urlify('/', 'http://go.com/////');
    expect(res).toBe('/');
    res = urlService.urlify('/', 'http://go.com', true);
    expect(res).toBe('http://go.com');
  });

  it('handles a base url with a path', () => {
    let res = urlService.urlify('/', 'http://go.com/zoo');
    expect(res).toBe('/zoo');

    res = urlService.urlify('/', 'http://go.com/zoo', true);
    expect(res).toBe('http://go.com/zoo');

    res = urlService.urlify('/bang', 'http://go.com/zoo');
    expect(res).toBe('/zoo/bang');

    res = urlService.urlify('/bang', 'http://go.com/zoo', true);
    expect(res).toBe('http://go.com/zoo/bang');

    res = urlService.urlify('/bang', 'http://go.com/zoo/', false);
    expect(res).toBe('/zoo/bang');

    res = urlService.urlify('/bang/', 'http://go.com/zoo/', true);
    expect(res).toBe('http://go.com/zoo/bang');

    res = urlService.urlify('/bang/bandito/123', 'http://go.com/zoo/', true);
    expect(res).toBe('http://go.com/zoo/bang/bandito/123');

    res = urlService.urlify('/bang/bandito/123', 'http://go.com/zoo/', false);
    expect(res).toBe('/zoo/bang/bandito/123');

    res = urlService.urlify(
      '/bang/bandito/123?panza=brutale&corsa=13',
      'http://go.com/zoo/',
      false
    );
    expect(res).toBe('/zoo/bang/bandito/123?panza=brutale&corsa=13');
  });
});

describe('isHomePage', () => {
  it('handles empty parameters', () => {
    expect(urlService.isHomePage('http://go.com')).toBe(true);
    expect(urlService.isHomePage('http://go.com/')).toBe(true);
  });

  it('handles bad parameters', () => {
    expect(urlService.isHomePage('')).toBe(false);
    expect(urlService.isHomePage('boo')).toBe(false);
    expect(urlService.isHomePage('http://go.com?flock32')).toBe(true);
  });

  it('handles funny slashes', () => {
    expect(urlService.isHomePage('http://go.com/bazinga?flock32')).toBe(false);
  });
});
