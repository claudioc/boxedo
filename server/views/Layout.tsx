import { getJsBundleName } from '../lib/assets';
import { JSX } from 'preact';
import { cssFile } from '../lib/assets';
import { Menu } from './components/Menu';
import { INDEX_PAGE_ID } from '../constants';

interface LayoutProps {
  title: string;
  pageId?: string;
  children: string | JSX.Element[] | JSX.Element;
}

export const Layout = ({ title, pageId, children }: LayoutProps) => {
  const isIndex = pageId === INDEX_PAGE_ID;

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
        <header>
          This is it {!isIndex ? <a href="/">Go home now</a> : ''}
        </header>
        <Menu pageId={pageId} />
        <main class="row">
          <div class="col-3" hx-get="/parts/pages" hx-trigger="load"></div>
          <div class="col">{children}</div>
        </main>
      </body>
    </html>
  );
};
