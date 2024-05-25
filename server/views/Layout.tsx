import { getJsBundleName, cssFile } from '~/lib/assets';
import { JSX } from 'preact';
import { Feedback } from './components/Feedback';
import { Search } from './components/Search';
import { getFeedback } from '~/lib/feedbacks';
import styles from './Layout.module.css';
import clsx from 'clsx';
import { PageModel } from '~/types';

interface LayoutProps {
  title: string;
  page?: PageModel;
  feedbackCode?: number;
  children: string | JSX.Element[] | JSX.Element;
}

export const Layout = ({
  title,
  page,
  feedbackCode,
  children,
}: LayoutProps) => {
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
        <script src="/a/vendor/htmx.min.js"></script>
      </head>
      <body x-data class="container is-widescreen" {...onKeypress}>
        <script src={getJsBundleName()}></script>
        {process.env.NODE_ENV === 'development' && (
          <script>{'App.livereload()'}</script>
        )}
        <header class={clsx(styles.header, 'level', 'py-3')}>
          <div class="level-item level-left">
            <div class="title">
              <a href="/" class="has-text-warning">
                Joongle
              </a>
            </div>
          </div>
          <div class="level-item level-right">
            <Search />
          </div>
        </header>

        <div class="block" x-show="$store.has.some()">
          <Feedback feedback={getFeedback(feedbackCode)} />
        </div>

        <main class="columns">
          {page && (
            <div
              class="column is-4"
              hx-get={`/parts/nav/${page._id}`}
              hx-trigger="load"
            ></div>
          )}
          <div class="column is-8">{children}</div>
        </main>
      </body>
    </html>
  );
};
