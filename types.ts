import type { FastifyInstance } from 'fastify';
import type { MangoOperator, MangoSelector, MangoValue } from 'nano';

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

export type ModelName = 'settings' | 'page' | 'file';

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
  docId: string;
  attachmentName: string;
  attachment: Buffer | NodeJS.ReadableStream;
  contentType: string;
  params?: { rev?: string };
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
