import { Layout } from './Layout';
import { PageModel } from '../types';
import styles from './ReadPage.module.css';

export interface ReadPageProps {
  page: PageModel;
}

export const ReadPage = ({ page }: ReadPageProps) => (
  <Layout title={page.pageTitle} pageId={page.pageId}>
    <div className={styles.ReadPage}>
      <h1>{page.pageTitle}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.pageContent || '' }}></div>
    </div>
  </Layout>
);
