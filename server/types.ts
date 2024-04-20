export type NodeEnv = 'development' | 'production' | 'test';

export interface PageModel {
  _id?: string;
  pageId: string;
  parentPageId?: string | null;
  pageTitle: string;
  pageSlug: string;
  pageSlugs: string[];
  pageContent: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageHistoryItem {
  pageTitle: string;
  pageContent: string;
  updateAt: Date;
  timestamp: Date;
}

export interface PageHistoryModel {
  pageId: string;
  history: PageHistoryItem[];
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
