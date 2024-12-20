import { Layout } from './Layout';
import type { PageModel, WithI18nProps } from '~/types';
import { formatDate, isSameTimestamp } from '~/lib/helpers';
import { PageMenu } from './components/PageMenu';
import { PageBody } from './components/PageBody';
import { useApp } from '~/lib/context/App';

import styles from './ReadPage.module.css';

export interface ReadPageProps extends WithI18nProps {
  page?: PageModel;
  // There are no pages in the database so we show a nicer welcome page
  isWelcome?: boolean;
  // Whether to show the full page or just the body
  isFull?: boolean;
}

type PageModelPartial = Pick<PageModel, 'pageTitle' | 'pageContent'>;

const welcomePage: PageModelPartial = {
  pageTitle: 'Welcome to Joongle!',
  pageContent:
    '<p>To get started, add your first page by using on the "Create page" button above</p>',
};

const noLandingPage: PageModelPartial = {
  pageTitle: 'This is your landing page',
  pageContent:
    '<p>There are already several pages that you can select as your landing page</p>',
};

export const ReadPage = ({
  page,
  isFull = true,
  isWelcome = false,
}: ReadPageProps) => {
  const { i18n } = useApp();

  // We may receive an undefined page if we want to show the welcome page
  // or we still don't have a landing page
  const showNoLandingPage = !page && !isWelcome;
  const showPage = page && !isWelcome;

  const actualPage = showPage
    ? page
    : showNoLandingPage
      ? noLandingPage
      : welcomePage;

  const content = (
    <div class={styles.ReadPage}>
      {showPage && (
        <div class="level level-right has-text-grey is-size-7">
          <>
            {i18n.t('ReadPage.createdOn')} {formatDate(page.createdAt)}
            {!isSameTimestamp(page.updatedAt, page.createdAt) &&
              ` (${formatDate(page.updatedAt)})`}
            <PageMenu page={page} />
          </>
        </div>
      )}
      <PageBody title={actualPage.pageTitle} body={actualPage.pageContent} />
    </div>
  );

  return isFull ? (
    <Layout
      context="viewing page"
      title={actualPage.pageTitle}
      page={showPage ? page : undefined}
    >
      {content}
    </Layout>
  ) : (
    content
  );
};
