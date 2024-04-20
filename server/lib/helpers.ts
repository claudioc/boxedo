import { Feedback, PageModel } from '~/types';
import { INDEX_PAGE_ID } from '~/constants';

export const slugUrl = (slug: string) => (slug === '/' ? '/' : `/page/${slug}`);

export const pathWithFeedback = (path: string, feedback?: Feedback) => {
  if (!feedback) {
    return path;
  }

  return `${path}?f=${feedback.code}`;
};

export const formatDate = (date: Date, def: string = '') => {
  if (!date) return def;

  return new Intl.DateTimeFormat('en-UK', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

export const isIndexPage = (page: PageModel) => page.pageId === INDEX_PAGE_ID;

export const isIndexPlaceholderPage = (page: PageModel) =>
  isIndexPage(page) && page.pageSlug === '';
