import { getBundleFilename, cssFile } from '~/lib/assets';
import type { JSX } from 'preact';
import { Feedback } from './components/Feedback';
import { Search } from './components/Search';
import { getFeedbackByCode } from '~/lib/feedbacks';
import styles from './Layout.module.css';
import clsx from 'clsx';
import type { PageModel } from '~/types';
import { useApp } from '~/lib/context/App';

interface LayoutProps {
  title: string;
  page?: PageModel;
  children: string | JSX.Element[] | JSX.Element;
  useEditor?: boolean;
}

export const Layout = ({
  title,
  page,
  children,
  useEditor = false,
}: LayoutProps) => {
  const { config, feedbackCode } = useApp();
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
      <body x-data class="container is-widescreen" {...onKeypress}>
        <script src={getBundleFilename('app')} />
        {useEditor && <script src={getBundleFilename('editor')} />}
        {process.env.NODE_ENV === 'development' && (
          <script>{'App.livereload()'}</script>
        )}
        <header class={clsx(styles.header, 'level', 'py-3')}>
          <div class="level-item level-left">
            <div class="title">
              <a href="/" class="has-text-warning">
                {config.WEBSITE_TITLE}
              </a>
            </div>
          </div>
          <div class="level-item level-right">
            <Search />
          </div>
        </header>

        <div class="block" x-show="$store.has.some()">
          <Feedback feedback={getFeedbackByCode(feedbackCode)} />
        </div>

        <main class="columns">
          {page && (
            <div
              class="column is-4"
              hx-get={`/parts/nav/${page._id}`}
              hx-trigger="load"
            />
          )}
          {/* #main-page-body is used as a hx-target */}
          <div class="column is-8" id="main-page-body">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
};
