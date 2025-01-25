import type { Feedback, PageModel } from '~/../types';

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
  // Match URLs like /uploads/123/image.jpg
  const fileUrlPattern = /\/uploads\/([^\/]+)\/([^\"'\s]+)/g;
  const fileRefs = new Set<string>();

  let match: RegExpExecArray | null;
  while (true) {
    match = fileUrlPattern.exec(content);
    if (match === null) break;
    const [, fileId] = match;
    fileRefs.add(fileId);
  }

  return fileRefs;
};
