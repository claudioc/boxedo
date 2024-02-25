import { ObjectId } from 'mongodb';

export interface PageProps {
  title: string;
  content?: string | null;
}

export type NodeEnv = 'development' | 'production';

export interface PageModel {
  _id: ObjectId;
  pageId: string;
  pageParentId: string;
  pageTitle: string;
  pageContent: string;
}

export type PageWithoutContentModel = Omit<PageModel, 'pageContent'>;
