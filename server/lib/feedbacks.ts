import { Feedback } from '~/types';

type ErrorCodes =
  | 'E_INDEX_ALREADY_EXISTS'
  | 'E_CREATING_INDEX'
  | 'E_MISSING_PAGE'
  | 'E_UPDATING_PAGE'
  | 'E_CANNOT_DELETE_INDEX'
  | 'E_MISSING_PARENT'
  | 'E_DELETING_PAGE'
  | 'E_CREATING_PAGE'
  | 'E_MISSING_DB'
  | 'E_EMPTY_TITLE'
  | 'E_EMPTY_CONTENT'
  | 'E_WRONG_PARENT_PAGE'
  | 'E_INVALID_PARENT_PAGE';

type SuccessCodes =
  | 'S_PAGE_CREATED'
  | 'S_PAGE_UPDATED'
  | 'S_PAGE_DELETED'
  | 'S_PAGE_MOVED';

export const Feedbacks: { [key in ErrorCodes | SuccessCodes]: Feedback } = {
  S_PAGE_CREATED: {
    code: 1,
    message: 'Page created',
  },
  S_PAGE_UPDATED: {
    code: 2,
    message: 'Page updated',
  },
  S_PAGE_DELETED: {
    code: 3,
    message: 'Page deleted',
  },
  S_PAGE_MOVED: {
    code: 4,
    message: 'Page moved to a new parent',
  },
  E_INDEX_ALREADY_EXISTS: {
    code: 100,
    message: 'Index already exists',
  },
  E_CREATING_INDEX: {
    code: 101,
    message: 'Error creating index page',
  },
  E_MISSING_PAGE: {
    code: 102,
    message: 'Error loading the page',
  },
  E_UPDATING_PAGE: {
    code: 103,
    message: 'Error updating page',
  },
  E_CANNOT_DELETE_INDEX: {
    code: 104,
    message: 'Cannot delete the index page',
  },
  E_MISSING_PARENT: {
    code: 105,
    message: 'Parent page not found',
  },
  E_DELETING_PAGE: {
    code: 106,
    message: 'Error deleting page',
  },
  E_CREATING_PAGE: {
    code: 107,
    message: 'Error creating page',
  },
  E_MISSING_DB: {
    code: 108,
    message: 'Database not connected or collection not found',
  },
  E_EMPTY_TITLE: {
    code: 109,
    message: 'Title cannot be empty',
  },
  E_EMPTY_CONTENT: {
    code: 110,
    message: 'Content cannot be empty',
  },
  E_WRONG_PARENT_PAGE: {
    code: 111,
    message: 'Parent page is invalid or not found',
  },
  E_INVALID_PARENT_PAGE: {
    code: 112,
    message: 'Parent page is missing or invalid',
  },
} as const;

export const getFeedback = (code: number) =>
  Object.values(Feedbacks).find((f) => f.code === code);

export const isFeedbackError = (feedback: Feedback) => feedback.code >= 100;
