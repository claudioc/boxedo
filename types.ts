import type { FastifyInstance } from 'fastify';
import type { MangoOperator, MangoSelector, MangoValue } from 'nano';
import type { FromSchema } from 'json-schema-to-ts';

export type NodeEnv = 'development' | 'production' | 'test';

export type Context =
  | 'none'
  | 'editing page'
  | 'viewing page'
  | 'moving page'
  | 'uploading file';

type WithoutId<T> = Omit<T, '_id' | '_rev'>;

export interface WithApp {
  app: FastifyInstance;
}

export type PluralName<T extends string> = T extends 'settings' ? T : `${T}s`;
export type ModelName = 'settings' | 'page' | 'file' | 'magic';
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
  email: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
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

export const ConfigEnvSchema = {
  type: 'object',
  properties: {
    BASE_URL: { type: 'string', default: 'http://localhost:3000' },
    NODE_ENV: { type: 'string', default: 'development' },
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
    EMAIL_PROVIDER: {
      type: 'string',
      enum: ['sendgrid', 'mailgun', 'smtp', 'dummy'],
    },
    EMAIL_API_KEY: { type: 'string' },
    EMAIL_DOMAIN: { type: 'string' },
    EMAIL_HOST: { type: 'string' },
    EMAIL_PORT: { type: 'integer' },
    EMAIL_FROM_EMAIL: { type: 'string' },
  },
} as const;

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
