import { getBundleFilename, cssFile } from '~/lib/assets';
import type { JSX } from 'preact';
import { Feedback } from './components/Feedback';
import { Search } from './components/Search';
import { getFeedbackByCode } from '~/lib/feedbacks';
import styles from './Layout.module.css';
import clsx from 'clsx';
import type { PageModel, Context } from '~/types';
import { useApp } from '~/lib/context/App';

interface LayoutProps {
  title: string;
  page?: PageModel | null;
  children: string | JSX.Element[] | JSX.Element;
  context?: Context;
  withEditor?: boolean;
  withCreateButton?: boolean;
}

export const Layout = ({
  title,
  page,
  children,
  context = 'none',
  withEditor = false,
  withCreateButton = true,
}: LayoutProps) => {
  const { config, feedbackCode, i18n } = useApp();
  const onKeypress = {
    '@keyup.escape': '$store.has.none()',
  };

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Joongle - {title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Joongle is the ultimate CMS" />
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
        <main class="columns mt-0" data-context={context}>
          <div
            class={clsx(
              styles.mainLeft,
              'column',
              'is-narrow',
              'has-background-info-dark',
              'p-5'
            )}
          >
            <header class={clsx(styles.header, 'block')}>
              <div class="block">
                <div class="subtitle">
                  <a href="/" class="has-text-warning">
                    {config.WEBSITE_TITLE}
                  </a>
                </div>
              </div>
              <div class="block">
                <Search />
              </div>
            </header>

            {withCreateButton && (
              <div class="block">
                {/* The href is dynamically updated by our htmx extension */}
                <a class="button" href={`/create/${page ? page._id : ''}`}>
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
          <div class="column p-5" id="main-page-body">
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
