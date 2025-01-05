import { getBundleFilename, cssFile } from '~/lib/assets';
import type { JSX } from 'preact';
import { Feedback } from './components/Feedback';
import { Search } from './components/Search';
import { getFeedbackByCode } from '~/lib/feedbacks';
import styles from './Layout.module.css';
import clsx from 'clsx';
import type { PageModel, Context } from '~/types';
import { useApp } from '~/lib/context/App';
import { CogIcon } from './icons/CogIcon';

interface LayoutProps {
  title: string;
  page?: PageModel | null;
  children: string | JSX.Element[] | JSX.Element;
  context?: Context;
  isLandingPage?: boolean;
  withEditor?: boolean;
  withCreateButton?: boolean;
}

export const Layout = ({
  title,
  page,
  children,
  context = 'none',
  isLandingPage = false,
  withEditor = false,
  withCreateButton = true,
}: LayoutProps) => {
  const { feedbackCode, i18n, settings } = useApp();
  const onKeypress = {
    '@keyup.escape': '$store.has.none()',
  };

  const createButtonLink =
    isLandingPage || !page ? '/create' : `/create/${page._id}`;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Joongle - {title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Joongle is the ultimate CMS" />
        {withEditor && <meta http-equiv="Cache-Control" content="no-store" />}
        <link rel="stylesheet" href={cssFile} />
        <script src="/a/vendor/htmx.min.js" />
      </head>
      <body x-data {...onKeypress}>
        <script src={getBundleFilename('app')} />
        {withEditor && <script src={getBundleFilename('editor')} />}
        {process.env.NODE_ENV === 'development' && (
          <script>{'App.livereload()'}</script>
        )}

        {/* We use the context to identify what we are doing, like 'editing page' for example; useful for CSS or JS targeting */}
        <main class="columns mt-0 ml-0" data-context={context}>
          <div
            class={clsx(
              styles.mainLeft,
              'column',
              'is-narrow',
              'has-background-info-dark'
            )}
          >
            <header class={clsx(styles.header, 'block')}>
              <div class="block">
                <div class="level">
                  <div class={clsx(styles.title, 'is-size-5', 'level-left')}>
                    <a href="/" class="has-text-warning">
                      {settings.siteTitle}
                    </a>
                  </div>
                  <div class="level-right">
                    <a
                      href="/settings"
                      aria-label={i18n.t('Navigation.editSettings')}
                      class=" has-text-grey-lighter"
                    >
                      <CogIcon />
                    </a>
                  </div>
                </div>
              </div>
              <div class="block">
                <Search />
              </div>
            </header>

            {withCreateButton && (
              <div class="block">
                {/* The href is dynamically updated by our htmx extension */}
                <a class="button" href={createButtonLink}>
                  {i18n.t('Navigation.createPage')}
                </a>
              </div>
            )}
            <aside
              class={clsx(styles.aside, 'block')}
              hx-get={`/parts/nav/${page ? page._id : ''}`}
              hx-trigger="load once"
            >
              <div class="skeleton-lines">
                <div />
                <div />
                <div />
                <div />
                <div />
              </div>
            </aside>
          </div>

          {/* #main-page-body is used as a hx-target */}
          <div class="column p-3 pr-5" id="main-page-body">
            <div x-show="$store.has.some()">
              <Feedback feedback={getFeedbackByCode(feedbackCode)} />
            </div>
            {children}
          </div>
        </main>
      </body>
    </html>
  );
};
