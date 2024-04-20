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
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Joongle - {title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Joongle is the ultimate CMS" />
        <link rel="stylesheet" href={cssFile} />
        <script src="/a/vendor/htmx.min.js"></script>
        {process.env.NODE_ENV === 'development' && (
          <script src="http://localhost:35729/livereload.js?snipver=1"></script>
        )}
      </head>
      <body class="container">
        <script src={getJsBundleName()}></script>
        <header class={clsx(styles.header, 'level', 'py-3')}>
          <div class="level-left">
            <div class="title">
              <a href="/" class="has-text-warning">
                Joongle
              </a>
            </div>
          </div>
          <div class="level-right">
            <Search />
          </div>
        </header>

        <Feedback feedback={getFeedback(feedbackCode)} />

        <main class="columns">
          {page && (
            <div
              class="column is-4"
              hx-get={`/parts/nav/${page.pageId}`}
              hx-trigger="load"
            ></div>
          )}
          <div class="column">{children}</div>
        </main>
      </body>
    </html>
  );
};
