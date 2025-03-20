import type { PageModel, WithCtx } from '~/../types';
import { formatDate, isSameTimestamp } from '~/lib/helpers';
import { MainContent } from './components/MainContent';
import { PageBody } from './components/PageBody';
import { PageMenu } from './components/PageMenu';
import { Layout } from './Layout';

export interface ReadPageProps extends WithCtx {
  page?: PageModel;
  // There are no pages in the database so we show a nicer welcome page
  isWelcome?: boolean;
  // Whether to show the full page or just the body
  isFull?: boolean;
  // Whether we are showing the landing page or not
  isLandingPage?: boolean;
}

type PageModelPartial = Pick<PageModel, 'pageTitle' | 'pageContent'>;

const welcomePage: PageModelPartial = {
  pageTitle: '', // Handled by translations
  pageContent: '', // Handled by translations
};

export const ReadPage = ({
  ctx,
  page,
  isFull = true,
  isWelcome = false,
  isLandingPage = false,
}: ReadPageProps) => {
  const { i18n } = ctx.app;

  // We may receive an undefined page if we want to show the welcome page
  // or we still don't have a landing page
  const showPage = page && !isWelcome;
  if (!showPage) {
    welcomePage.pageContent = welcomePage.pageContent = i18n.t(
      'WelcomePage.content',
      {
        buttonLabel: i18n.t('Navigation.createTopPage'),
      }
    );
    welcomePage.pageTitle = i18n.t('WelcomePage.title');
  }

  const actualPage = showPage ? page : welcomePage;

  const content = (
    <div
      // These classes are referenced in tests
      class={[
        isWelcome && 'is-welcome',
        showPage && 'is-page',
        isLandingPage && 'is-landing',
      ]}
      data-page-id={page?._id}
    >
      {showPage && (
        <div class="text-sm flex justify-between items-center gap-2 mb-5 ">
          <div class="opacity-25">
            {i18n.t('ReadPage.createdOn')}{' '}
            {formatDate(page.createdAt, ctx.prefs.siteLang)}
            {!isSameTimestamp(page.updatedAt, page.createdAt) &&
              ` (${formatDate(page.updatedAt, ctx.prefs.siteLang)})`}
            &nbsp; ({page.author})
          </div>
          <PageMenu ctx={ctx} page={page} />
        </div>
      )}
      <MainContent>
        <PageBody
          ctx={ctx}
          title={actualPage.pageTitle}
          body={actualPage.pageContent}
        />
      </MainContent>
    </div>
  );

  return isFull ? (
    <Layout
      ctx={ctx}
      context="viewing page"
      title={actualPage.pageTitle}
      page={showPage ? page : undefined}
      isLandingPage={isLandingPage}
    >
      {content}
    </Layout>
  ) : (
    content
  );
};
