export type NodeEnv = 'development' | 'production' | 'test';

export interface PageModel {
  _id?: string;
  pageId: string;
  parentPageId?: string;
  pageTitle: string;
  pageSlug: string;
  pageSlugs: string[];
  pageContent: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NavItem {
  pageId: string;
  title: string;
  link: string;
  children: NavItem[];
}

export type PageWithoutContentModel = Omit<PageModel, 'pageContent'>;

interface Feedback {
  code: number;
  message: string;
}
