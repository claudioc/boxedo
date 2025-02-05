import type { Feedback } from '~/../types';

type ErrorCodes =
  | 'E_INDEX_ALREADY_EXISTS'
  | 'E_CREATING_INDEX'
  | 'E_MISSING_PAGE'
  | 'E_UPDATING_PAGE'
  | 'E_MISSING_PARENT'
  | 'E_DELETING_PAGE'
  | 'E_CREATING_PAGE'
  | 'E_MISSING_DB'
  | 'E_EMPTY_TITLE'
  | 'E_EMPTY_CONTENT'
  | 'E_WRONG_PARENT_PAGE'
  | 'E_INVALID_PARENT_PAGE'
  | 'E_MISSING_PAGES_DB'
  | 'E_INVALID_VERSION'
  | 'E_MISSING_REV'
  | 'E_REV_MISMATCH_ON_SAVE'
  | 'E_UNKNOWN_ERROR'
  | 'E_MISSING_SETTINGS_DB'
  | 'E_UPDATING_SETTINGS'
  | 'E_UPLOAD_DATA_MISSING'
  | 'E_UPLOAD_URL_PROBLEMATIC'
  | 'E_MISSING_FILES_DB'
  | 'E_CREATING_FILE'
  | 'E_CREATING_ATTACHMENT'
  | 'E_USER_NOT_FOUND'
  | 'E_MISSING_MAGICS_DB'
  | 'E_MISSING_SESSIONS_DB'
  | 'E_MISSING_USERS_DB'
  | 'E_CREATING_SESSION';

type SuccessCodes =
  | 'S_PAGE_CREATED'
  | 'S_PAGE_UPDATED'
  | 'S_PAGE_DELETED'
  | 'S_PAGE_MOVED'
  | 'S_SETTINGS_UPDATED'
  | 'S_MAGIC_LINK_SENT'
  | 'S_LOGIN_SUCCESS';

type AnyCode = ErrorCodes | SuccessCodes;

// Keep this as an object instead of a Map to have a really strict and tight typing
// The messages are translated but also we keep them here in plain text for the server logs
export const Feedbacks: { [key in AnyCode]: Feedback } = {
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
  S_SETTINGS_UPDATED: {
    code: 5,
    message: 'Settings updated',
  },
  S_MAGIC_LINK_SENT: {
    code: 6,
    message: 'Magic link sent',
  },
  S_LOGIN_SUCCESS: {
    code: 7,
    message: 'Login successful',
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
    message: 'Database not connected or connection invalid',
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
  E_MISSING_PAGES_DB: {
    code: 113,
    message: 'Database "Pages" not found',
  },
  E_UNKNOWN_ERROR: {
    code: 114,
    message: 'An unknown error occurred',
  },
  E_INVALID_VERSION: {
    code: 116,
    message: 'Invalid version number',
  },
  E_MISSING_REV: {
    code: 117,
    message: 'Revision number is missing',
  },
  E_REV_MISMATCH_ON_SAVE: {
    code: 118,
    message:
      'Revision mismatch detected. Someone may have changed the content. Please try again.',
  },
  E_MISSING_SETTINGS_DB: {
    code: 119,
    message: 'Database "Settings" not found',
  },
  E_UPDATING_SETTINGS: {
    code: 120,
    message: 'Error updating settings',
  },
  E_UPLOAD_DATA_MISSING: {
    code: 121,
    message: 'Either the URL or the file is missing',
  },
  E_UPLOAD_URL_PROBLEMATIC: {
    code: 122,
    message: 'The URL provided is not valid',
  },
  E_MISSING_FILES_DB: {
    code: 123,
    message: 'The files db is missing',
  },
  E_CREATING_FILE: {
    code: 124,
    message: 'An error occurred while inserting a file in the db',
  },
  E_CREATING_ATTACHMENT: {
    code: 125,
    message: 'An error occurred while inserting an attachment in the db',
  },
  E_USER_NOT_FOUND: {
    code: 126,
    message: 'No user is known with this email',
  },
  E_MISSING_MAGICS_DB: {
    code: 127,
    message: 'The magics db is missing',
  },
  E_MISSING_SESSIONS_DB: {
    code: 128,
    message: 'The sessions db is missing',
  },
  E_MISSING_USERS_DB: {
    code: 129,
    message: 'The users db is missing',
  },
  E_CREATING_SESSION: {
    code: 130,
    message: 'An error occurred while creating a session',
  },
} as const;

const feedbackValues = Object.values(Feedbacks);
export const getFeedbackByCode = (code?: number) =>
  code ? feedbackValues.find((f) => f.code === code) : undefined;

export const getFeedbackKeyByCode = (code: number): string => {
  return `Feedbacks.${
    Object.entries(Feedbacks).find(
      ([_, feedback]) => feedback.code === code
    )?.[0]
  }`;
};

export const isFeedbackError = (feedback: Feedback) => feedback.code >= 100;
