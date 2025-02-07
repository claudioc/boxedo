import { Layout } from './Layout';
import type { PageModel, TextSize, WithCtx } from '~/../types';
import { formatDate, isSameTimestamp } from '~/lib/helpers';
import { PageMenu } from './components/PageMenu';
import { PageBody } from './components/PageBody';
import { MainContent } from './components/MainContent';

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

const mapTextSize = (size: TextSize) => {
  switch (size) {
    case 'S':
      return 'is-size-7';
    case 'M':
      return 'is-size-6';
    case 'L':
      return 'is-size-5';
    case 'XL':
      return 'is-size-4';
  }
};

export const ReadPage = ({
  ctx,
  page,
  isFull = true,
  isWelcome = false,
  isLandingPage = false,
}: ReadPageProps) => {
  const { i18n } = ctx.app;

  const textSizeClass = mapTextSize(ctx.app.settings.textSize);

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
        textSizeClass,
      ]}
      data-page-id={page?._id}
    >
      {showPage && (
        <div class="level level-right has-text-grey is-size-7 page-actions is-flex-direction-row">
          {i18n.t('ReadPage.createdOn')} {formatDate(page.createdAt)}
          {!isSameTimestamp(page.updatedAt, page.createdAt) &&
            ` (${formatDate(page.updatedAt)})`}
          <PageMenu ctx={ctx} page={page} />
        </div>
      )}
      <MainContent>
        <PageBody title={actualPage.pageTitle} body={actualPage.pageContent} />
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
