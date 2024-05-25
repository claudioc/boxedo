import { Feedback, PageModel } from '~/types';

export const slugUrl = (slug: string) => (slug === '/' ? '/' : `/page/${slug}`);

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

export const isIndexPage = (page: PageModel) => page.parentId === null;

export const isIndexPlaceholderPage = (page: PageModel) =>
  isIndexPage(page) && page.pageSlug === '';
