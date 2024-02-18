import { getJsBundleName } from '../lib/assets';
import { JSX } from 'preact';
import { cssFile } from '../lib/assets';
import { PageProps } from '../types';

interface LayoutProps extends PageProps {
  isIndex?: boolean;
  children: string | JSX.Element[] | JSX.Element;
}

export const Layout = ({ title, isIndex = false, children }: LayoutProps) => (
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
      <header>This is it {!isIndex ? <a href="/">Go home now</a> : ''}</header>
      <main class="row">
        <div class="col">{children}</div>
      </main>
    </body>
  </html>
);
