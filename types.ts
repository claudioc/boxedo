import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

export const nodeEnv = ['development', 'production', 'test'] as const;
export type NodeEnv = (typeof nodeEnv)[number];

export const authenticationTypes = ['none', 'magiclink'] as const;
export type AuthenticationType = (typeof authenticationTypes)[number];

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

export const supportedLanguages = ['en', 'it'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];
export const DEFAULT_SUPPORTED_LANGUAGE: SupportedLanguage = 'en';

export const dbBackends = ['local', 'remote', 'memory'] as const;
export type DbBackend = (typeof dbBackends)[number];
export const DEFAULT_DB_BACKEND: DbBackend = 'local';

export interface DbServiceInitParams {
  logger: FastifyBaseLogger;
  config: ConfigEnv;
}

export type Ctx = {
  app: FastifyInstance;
  user?: UserModel | null;
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

export type PluralName<T extends string> = T extends 'settings' ? T : `${T}s`;
export type ModelName =
  | 'settings'
  | 'page'
  | 'file'
  | 'magic'
  | 'session'
  | 'user';

type DocumentType = 'settings' | 'file' | 'magic' | 'session' | 'user' | 'page';

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
  siteLang: string;
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
  createdAt: string;
}

export interface PageModel extends BaseModel {
  type: 'page';
  parentId?: string | null;
  pageTitle: string;
  pageSlug: string;
  pageSlugs: string[];
  pageContent: string;
  position: number;
  contentUpdated: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DocumentModel =
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
    BASE_EXTERNAL_URL: { type: 'string', default: 'http://localhost:3000' },
    BASE_INTERNAL_URL: { type: 'string', default: 'http://localhost:3000' },
    NODE_ENV: {
      type: 'string',
      default: 'development' satisfies NodeEnv,
      enum: nodeEnv,
    },
    DB_BACKEND: {
      type: 'string',
      enum: dbBackends,
      default: DEFAULT_DB_BACKEND satisfies DbBackend,
    },
    DB_NAME: {
      type: 'string',
      default: 'joongle',
    },
    DB_REMOTE_URL: {
      type: 'string',
      default: 'http://localhost:5984',
    },
    DB_LOCAL_PATH: {
      type: 'string',
      default: '.',
    },
    DB_REMOTE_USER: { type: 'string', default: '' },
    DB_REMOTE_PASSWORD: { type: 'string', default: '' },
    LIVERELOAD_URL: { type: 'string', default: 'http://localhost:8007' },
    SETTINGS_LANGUAGE: {
      type: 'string',
      default: DEFAULT_SUPPORTED_LANGUAGE satisfies SupportedLanguage,
    },
    SETTINGS_DESCRIPTION: {
      type: 'string',
      default: 'Content management made easy',
    },
    SETTINGS_TITLE: { type: 'string', default: 'Joongle' },
    SETTINGS_TEXT_SIZE: {
      type: 'string',
      enum: textSizes,
      default: DEFAULT_TEXT_SIZE satisfies TextSize,
    },
    AUTHENTICATION_TYPE: {
      type: 'string',
      enum: authenticationTypes,
      default: 'none' satisfies AuthenticationType,
    },
    EMAIL_PROVIDER: {
      type: 'string',
      enum: emailProviderNames,
      default: 'dummy' satisfies EmailProviderName,
    },
    EMAIL_API_KEY: { type: 'string' },
    EMAIL_DOMAIN: { type: 'string' },
    EMAIL_HOST: { type: 'string' },
    EMAIL_PORT: { type: 'integer' },
    EMAIL_FROM_EMAIL: { type: 'string' },
  },
  if: {
    properties: {
      AUTHENTICATION_TYPE: {
        not: { const: 'none' },
      },
    },
  },
  // biome-ignore lint/suspicious/noThenProperty:
  then: {
    properties: {
      EMAIL_PROVIDER: {
        type: 'string',
        not: {
          enum: ['', 'dummy'],
        },
      },
    },
    required: ['EMAIL_PROVIDER'],
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
