import { Feedback } from '../types';

export const pageUrl = (pageSlug: string) => `/page/${pageSlug}`;

export const pathWithFeedback = (path: string, feedback?: Feedback) => {
  if (!feedback) {
    return path;
  }

  return `${path}?f=${feedback.code}`;
};
