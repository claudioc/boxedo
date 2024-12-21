import type { MangoOperator, MangoSelector, MangoValue } from 'nano';
import type Polyglot from 'node-polyglot';

export type NodeEnv = 'development' | 'production' | 'test';

export type Context = 'none' | 'editing page' | 'viewing page';

export interface SettingsModel {
  _id: string;
  _rev?: string;
  landingPageId: string | null;
  siteTitle: string;
  siteDescription: string;
  siteLang: string;
}

export interface PageModel {
  _id: string;
  _rev?: string;
  parentId?: string | null;
  pageTitle: string;
  pageSlug: string;
  pageSlugs: string[];
  pageContent: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageModelWithRev extends PageModel {
  _rev: string;
}

export type PageModelWithoutId = Omit<PageModel, '_id' | '_rev'>;
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
  children: NavItem[];
}

export type PageWithoutContentModel = Omit<PageModel, 'pageContent'>;

export interface Feedback {
  code: number;
  message: string;
}

export interface WithI18nProps {
  i18n?: Polyglot;
}
