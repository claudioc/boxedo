import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { MangoOperator, MangoSelector, MangoValue } from 'nano';
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

export type Ctx = {
  app: FastifyInstance;
  req: FastifyRequest;
};

export type Context =
  | 'none'
  | 'editing page'
  | 'viewing page'
  | 'moving page'
  | 'uploading file';

type WithoutId<T> = Omit<T, '_id' | '_rev'>;

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
export type DbName = PluralName<ModelName>;

export interface SettingsModel {
  _id: string;
  _rev?: string;
  landingPageId: string | null;
  siteTitle: string;
  siteDescription: string;
  siteLang: string;
}

export interface FileModel {
  _id: string;
  _rev?: string;
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
    [filename: string]: {
      content_type: string;
      digest: string;
      length: number;
      revpos: number;
      stub: boolean;
    };
  };
}

export interface FileAttachmentModel {
  fileId: string;
  attachmentName: string;
  attachment: Buffer | NodeJS.ReadableStream;
  contentType: string;
  params?: { rev?: string };
}

export interface MagicModel {
  _id: string;
  _rev?: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface SessionModel {
  _id: string;
  _rev?: string;
  email: string;
  created: string;
  expires: string;
}

export interface UserModel {
  _id: string;
  _rev?: string;
  email: string;
  fullname: string;
  created: string;
}

export interface PageModel {
  _id: string;
  _rev?: string;
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

export interface PageModelWithRev extends PageModel {
  _rev: string;
}

export type SettingsModelWithoutId = WithoutId<SettingsModel>;
export type PageModelWithoutId = WithoutId<PageModel>;
export type PageModelWithoutRev = Omit<PageModel, '_rev'>;

export type PageSelector = {
  [K in MangoOperator | keyof PageModel]:
    | MangoSelector
    | MangoSelector[]
    | MangoValue
    | MangoValue[];
};

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
  required: ['COUCHDB_USER', 'COUCHDB_PASSWORD'],
  properties: {
    BASE_EXTERNAL_URL: { type: 'string', default: 'http://localhost:3000' },
    BASE_INTERNAL_URL: { type: 'string', default: 'http://localhost:3000' },
    NODE_ENV: {
      type: 'string',
      default: 'development' satisfies NodeEnv,
      enum: nodeEnv,
    },
    COUCHDB_URL: {
      type: 'string',
      default: 'http://localhost:5984',
    },
    COUCHDB_USER: { type: 'string' },
    COUCHDB_PASSWORD: { type: 'string' },
    LIVERELOAD_URL: { type: 'string', default: 'http://localhost:8007' },
    SETTINGS_LANGUAGE: { type: 'string', default: 'en' },
    SETTINGS_DESCRIPTION: {
      type: 'string',
      default: 'Content management made easy',
    },
    SETTINGS_TITLE: { type: 'string', default: 'Joongle' },
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
