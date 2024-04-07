import { getJsBundleName } from '../lib/assets';
import { JSX } from 'preact';
import { cssFile } from '../lib/assets';
import { Menu } from './components/Menu';
import { Feedback } from './components/Feedback';
import { Search } from './components/Search';
import { INDEX_PAGE_ID } from '../constants';
import { getFeedback } from '../lib/feedbacks';
import styles from './Layout.module.css';
import clsx from 'clsx';

interface LayoutProps {
  title: string;
  pageId?: string;
  hasMenu?: boolean;
  feedbackCode?: number;
  children: string | JSX.Element[] | JSX.Element;
}

export const Layout = ({
  title,
  pageId,
  hasMenu = true,
  feedbackCode,
  children,
}: LayoutProps) => {
  const isIndex = pageId === INDEX_PAGE_ID;

  let feedback;
  if (feedbackCode) {
    feedback = getFeedback(feedbackCode);
  }

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
      <body class="container">
        <script src={getJsBundleName()}></script>
        <header class={clsx(styles.header, 'level')}>
          <div class="level-left">
            <div>Joongle {!isIndex ? <a href="/">Home</a> : ''}</div>
          </div>
          <div class="level-right">
            <Search />
          </div>
        </header>

        {feedback && <Feedback feedback={feedback} />}
        {hasMenu && <Menu pageId={pageId} />}

        <main class="columns">
          {pageId && (
            <div
              class="column is-4"
              hx-get={`/parts/nav/${pageId}`}
              hx-trigger="load"
            ></div>
          )}
          <div class="column">{children}</div>
        </main>
      </body>
    </html>
  );
};
