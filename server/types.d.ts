export type NodeEnv = 'development' | 'production';

export interface PageModel {
  pageId: string;
  parentPageId?: string;
  pageTitle: string;
  pageContent: string;
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
