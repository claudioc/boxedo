import { Layout } from './Layout';
import { PageModel, WithI18nProps } from '~/types';
import { formatDate } from '~/lib/helpers';
import { PageMenu } from './components/PageMenu';
import { PageBody } from './components/PageBody';
import { useApp } from '~/lib/context/App';

import styles from './ReadPage.module.css';

export interface ReadPageProps extends WithI18nProps {
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
  const { i18n } = useApp();

  const content = (
    <div class={styles.ReadPage}>
      <div class="level level-right has-text-grey">
        {i18n.t('ReadPage.createdOn')} {formatDate(page.createdAt)}
        {page.updatedAt !== page.createdAt &&
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
