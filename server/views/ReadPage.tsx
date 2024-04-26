import { Layout } from './Layout';
import { PageModel } from '~/types';
import { formatDate } from '~/lib/helpers';
import { PageMenu } from './components/PageMenu';
import { PageBody } from './components/PageBody';

import styles from './ReadPage.module.css';

export interface ReadPageProps {
  page: PageModel;
  feedbackCode?: number;
  // Whether to show the full page or just the body
  isFull?: boolean;
}

export const ReadPage = ({
  page,
  feedbackCode,
  isFull = true,
}: ReadPageProps) => {
  const content = (
    <div class={styles.ReadPage}>
      <div class="level level-right has-text-grey">
        Created on {formatDate(page.createdAt)}
        {page.updatedAt.toISOString() !== page.createdAt.toISOString() &&
          ` (${formatDate(page.updatedAt)})`}
        <PageMenu page={page} />
      </div>
      <PageBody page={page} />
    </div>
  );

  return isFull ? (
    <Layout title={page.pageTitle} page={page} feedbackCode={feedbackCode}>
      {content}
    </Layout>
  ) : (
    content
  );
};
