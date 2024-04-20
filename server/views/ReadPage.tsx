import { Layout } from './Layout';
import { PageModel } from '~/types';
import { formatDate } from '~/lib/helpers';
import { PageMenu } from './components/PageMenu';
import { PageBody } from './components/PageBody';

import styles from './ReadPage.module.css';

export interface ReadPageProps {
  page: PageModel;
  feedbackCode?: number;
}

export const ReadPage = ({ page, feedbackCode }: ReadPageProps) => (
  <Layout title={page.pageTitle} page={page} feedbackCode={feedbackCode}>
    <div className={styles.ReadPage}>
      <div class="level level-right has-text-grey">
        Created on {formatDate(page.createdAt)}
        {page.updatedAt.toISOString() !== page.createdAt.toISOString() &&
          ` (${formatDate(page.updatedAt)})`}
        <PageMenu page={page} />
      </div>
      <PageBody page={page} />
    </div>
  </Layout>
);
