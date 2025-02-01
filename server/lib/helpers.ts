import type { Feedback, PageModel, UrlParts } from '~/../types';

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
    };
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
