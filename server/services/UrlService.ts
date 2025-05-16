import type { ConfigEnv } from '~/../types';
import { isValidUrl, parseBaseUrl } from '~/lib/helpers';

export class UrlService {
  private static instance: UrlService;

  private constructor(private config: ConfigEnv) {}

  static create(config: ConfigEnv) {
    UrlService.instance = new UrlService(config);
  }

  static getInstance(): UrlService {
    if (!UrlService.instance) {
      throw new Error('Unexpected missed urlService instance');
    }

    return UrlService.instance;
  }

  url(path: string, includeHostname = false) {
    return this.urlify(
      path,
      this.config.BXD_BASE_EXTERNAL_URL,
      includeHostname
    );
  }

  // Receives a path and a base url and join them into an absolute url
  // including full hostname and schema if needed
  urlify(
    path: string,
    // This is supposed to always be a valid URL with a hostname because is validated early on
    baseUrl: string,
    includeHostname = false
  ) {
    const npath = this.normalizePath(path);
    if (!isValidUrl(baseUrl)) {
      return npath;
    }

    const nurl = parseBaseUrl(baseUrl);

    if (!nurl) {
      return npath;
    }

    if (!includeHostname) {
      let res = `${this.normalizePath(nurl.pathname)}${npath}`.replace(
        '//',
        '/'
      );
      if (res !== '/') {
        res = res.replace(/\/+$/, '');
      }
      return res;
    }

    let res = `${baseUrl}${npath}`.replace(/(?<!:)\/\//g, '/');
    if (res !== '/') {
      res = res.replace(/\/+$/, '');
    }
    return res;
  }

  /**
   * Normalizes a path by:
   * - Trimming leading/trailing whitespace
   * - Converting multiple consecutive slashes to a single slash
   * - Ensuring the path starts with a single slash
   * - Removing trailing slashes (except for root path "/")
   */
  normalizePath(path: string): string {
    // Trim whitespace first
    let normalized = path.trim();

    if (normalized === '/') {
      return normalized;
    }

    // Remove spaces that are adjacent to slashes (before or after)
    normalized = normalized.replace(/\s*\/\s*/g, '/');

    // Replace multiple consecutive slashes with a single slash
    normalized = normalized.replace(/\/+/g, '/');

    // Ensure the path starts with a slash
    if (!normalized.startsWith('/')) {
      normalized = `/${normalized}`;
    }

    // Remove trailing slash (unless the path is just "/")
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }

  slugUrl(slug: string, baseUrl = this.config.BXD_BASE_EXTERNAL_URL): string {
    return this.urlify(
      slug === '/' || slug === '' ? '/' : `/view/${slug}`,
      baseUrl
    );
  }

  // Note that this works only with full URLs
  isHomePage(url: string) {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname;
      return path === this.url('/') || path === '';
    } catch {
      return false;
    }
  }
}
