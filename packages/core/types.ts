import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import type { SupportedLocales } from './locales/phrases';

export const nodeEnv = ['development', 'production', 'test'] as const;
export type NodeEnv = (typeof nodeEnv)[number];

export const authenticationTypes = ['none', 'magiclink'] as const;
export type AuthenticationType = (typeof authenticationTypes)[number];

export interface AnyLogger {
  error: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
}

export const emailProviderNames = [
  'sendgrid',
  'mailgun',
  'smtp',
  'dummy',
  '',
] as const;
export type EmailProviderName = (typeof emailProviderNames)[number];

export const textSizes = ['S', 'M', 'L', 'XL'] as const;
export type TextSize = (typeof textSizes)[number];
export const DEFAULT_TEXT_SIZE: TextSize = 'M';

export const DEFAULT_SUPPORTED_LOCALE: SupportedLocales = 'en';

// Map application locales to full BCP 47 language tags if needed
export const languageLocaleMap: Record<SupportedLocales, string> = {
  en: 'en-GB',
  it: 'it-IT',
};

export const dbBackends = ['local', 'remote', 'memory'] as const;
export type DbBackend = (typeof dbBackends)[number];
export const DEFAULT_BXD_DB_BACKEND: DbBackend = 'local';

export type Db = PouchDB.Database<DocumentModel>;

export interface DbServiceInitParams {
  logger: FastifyBaseLogger;
  config: ConfigEnv;
}

export type Ctx = {
  app: FastifyInstance;
  user: UserModel | null;
  prefs: PreferencesModel;
};

export type Context =
  | 'none'
  | 'editing page'
  | 'viewing page'
  | 'moving page'
  | 'uploading file';

export interface WithCtx {
  ctx: Ctx;
}

export type PluralName<T extends string> = T extends 'settings' | 'preferences'
  ? T
  : `${T}s`;
export type ModelName =
  | 'preferences'
  | 'settings'
  | 'page'
  | 'file'
  | 'magic'
  | 'session'
  | 'user';

type DocumentType =
  | 'settings'
  | 'preferences'
  | 'file'
  | 'magic'
  | 'session'
  | 'user'
  | 'page';

export interface BaseModel {
  _id: string;
  _rev?: string;
  type: DocumentType;
}

export interface SettingsModel extends BaseModel {
  type: 'settings';
  landingPageId: string | null;
  siteTitle: string;
  siteDescription: string;
}

export interface PreferencesModel extends BaseModel {
  type: 'preferences';
  siteLang: SupportedLocales;
  textSize: TextSize;
}

export interface FileModel extends BaseModel {
  type: 'file';
  originalName: string;
  originalMimetype: string;
  originalSize: number;
  processedSize: number;
  processedMimetype: string;
  originalDimensions: {
    width: number;
    height: number;
  };
  uploadedAt: string;
  _attachments?: {
    [filename: string]: PouchDB.Core.Attachment;
  };
}

export interface FileAttachmentModel {
  fileId: string;
  attachmentName: string;
  attachment: Buffer | NodeJS.ReadableStream;
  contentType: string;
  params?: { rev?: string };
}

export interface MagicModel extends BaseModel {
  type: 'magic';
  email: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface SessionModel extends BaseModel {
  type: 'session';
  email: string;
  createdAt: string;
  expiresAt: string;
}

export interface UserModel extends BaseModel {
  type: 'user';
  email: string;
  fullname: string;
  role: UserRole;
  createdAt: string;
}

// Double check the DEFAULT_PAGE_VALUES in the Page repository
export interface PageModel extends BaseModel {
  type: 'page';
  parentId?: string | null;
  pageTitle: string;
  pageSlug: string;
  pageSlugs: string[];
  pageContent: string;
  position: number;
  contentUpdated: boolean;
  author: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentModel =
  | PreferencesModel
  | SettingsModel
  | FileModel
  | MagicModel
  | SessionModel
  | UserModel
  | PageModel;

export interface PageRevInfo {
  rev: string;
  status: 'available' | 'missing' | 'deleted' | 'unknown';
}

export interface NavItem {
  pageId: string;
  title: string;
  link: string;
  position: number;
  children: NavItem[];
}

export type PageWithoutContentModel = Omit<PageModel, 'pageContent'>;

export interface Feedback {
  code: number;
  message: string;
}

// Do not try to validate this function against JSONSchema because in that case
// the FromSchema macro won't be able to extract the proper type.
export const ConfigEnvSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    BXD_BASE_EXTERNAL_URL: {
      type: 'string',
      default: 'http://localhost:3000',
    },
    BXD_BASE_INTERNAL_URL: {
      type: 'string',
      default: 'http://localhost:3000',
    },
    NODE_ENV: {
      type: 'string',
      default: 'development' satisfies NodeEnv,
      enum: nodeEnv,
    },
    BXD_DB_BACKEND: {
      type: 'string',
      enum: dbBackends,
      default: DEFAULT_BXD_DB_BACKEND satisfies DbBackend,
    },
    BXD_DB_NAME: {
      type: 'string',
      default: 'boxedo',
    },
    BXD_DB_REMOTE_URL: {
      type: 'string',
      default: 'http://localhost:5984',
    },
    BXD_DB_LOCAL_PATH: {
      type: 'string',
      default: '.',
    },
    BXD_DB_REMOTE_USER: { type: 'string', default: '' },
    BXD_DB_REMOTE_PASSWORD: { type: 'string', default: '' },
    BXD_LIVERELOAD_URL: { type: 'string', default: 'http://localhost:8007' },
    BXD_SETTINGS_LANGUAGE: {
      type: 'string',
      default: DEFAULT_SUPPORTED_LOCALE satisfies SupportedLocales,
    },
    BXD_SETTINGS_DESCRIPTION: {
      type: 'string',
      default: 'Content management made easy',
    },
    BXD_SETTINGS_TITLE: { type: 'string', default: 'Boxedo' },
    SETTINGS_TEXT_SIZE: {
      type: 'string',
      enum: textSizes,
      default: DEFAULT_TEXT_SIZE satisfies TextSize,
    },
    BXD_AUTHENTICATION_TYPE: {
      type: 'string',
      enum: authenticationTypes,
      default: 'none' satisfies AuthenticationType,
    },
    BXD_EMAIL_PROVIDER: {
      type: 'string',
      enum: emailProviderNames,
      default: 'dummy' satisfies EmailProviderName,
    },
    BXD_EMAIL_API_KEY: { type: 'string' },
    BXD_EMAIL_DOMAIN: { type: 'string' },
    EMAIL_HOST: { type: 'string' },
    EMAIL_PORT: { type: 'integer' },
    EMAIL_FROM_EMAIL: { type: 'string' },
    BXD_TITLE_PATTERN: {
      type: 'string',
      default: '{siteTitle} - {pageTitle}',
    },
    BXD_THEME: {
      type: 'string',
      default: 'dracula',
    },
  },
} as const satisfies JSONSchema;

export type ConfigEnv = FromSchema<typeof ConfigEnvSchema>;

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailMessage {
  to: EmailAddress;
  from: EmailAddress;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProviderConfig {
  type: string;
  [key: string]: unknown;
}

// Base interface for all email providers
export interface EmailProvider {
  initialize(config: EmailProviderConfig): Promise<void>;
  sendEmail(message: EmailMessage): Promise<void>;
}

export interface UrlParts {
  protocol: string;
  hostname: string;
  port: number;
  baseUrl: string;
  host: string;
  isLocalhost: boolean;
  pathname: string;
}

export type SearchHitPosition = [number, number]; // [start, length]

export interface SearchSnippet {
  text: string;
  positions: SearchHitPosition[]; // Positions relative to the snippet
}

export interface SearchResult {
  pageId: string;
  pageSlug: string;
  title: string;
  snippets: string;
}

export type SearchTitlesResult = {
  pageId: string;
  pageTitle: string;
};

export const userRoles = ['admin', 'author', 'reader', 'inactive'] as const;
export type UserRole = (typeof userRoles)[number];
export const userRolesAsSelectOptions = [
  { value: 'admin', name: 'Admin' },
  { value: 'author', name: 'Author' },
  { value: 'reader', name: 'Reader' },
  { value: 'inactive', name: 'Inactive' },
];

export const capabilities = [
  'impossible', // Nobody has this capability (for testing purposes)
  'login', // Can log in
  'settings:edit', // Can edit site settings
  'settings:view', // Can view site settings
  'pages:create', // Can create pages
  'pages:edit', // Can edit pages
  'pages:delete', // Can delete pages
  'pages:move', // Can move pages
  'pages:view', // Can view pages
  'pages:view_history', // Can view page history
  'users:manage', // Can manage users
  'uploads:create', // Can upload files
  'pref:edit', // Can edit preferences
] as const;
export type Capability = (typeof capabilities)[number];

// Map of roles to their capabilities
export const roleCapabilities: Record<UserRole, Capability[]> = {
  admin: [
    'login',
    'settings:edit',
    'settings:view',
    'pages:create',
    'pages:edit',
    'pages:delete',
    'pages:move',
    'pages:view',
    'pages:view_history',
    'users:manage',
    'uploads:create',
    'pref:edit',
  ],
  author: [
    'login',
    'settings:view',
    'pages:create',
    'pages:edit',
    'pages:delete',
    'pages:move',
    'pages:view',
    'pages:view_history',
    'uploads:create',
    'pref:edit',
  ],
  reader: ['login', 'pages:view', 'pages:view_history', 'pref:edit'],
  inactive: [
    // No capabilities - deactivated user
  ],
};

// Extend UserModel to include role
export interface UserModel extends BaseModel {
  type: 'user';
  email: string;
  fullname: string;
  role: UserRole;
  createdAt: string;
}
