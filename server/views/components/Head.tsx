import { cssFile } from '~/lib/assets';
import type { WithApp } from '~/../types';

interface HeadProps extends WithApp {
  title: string;
  withEditor: boolean;
  withVendorScripts?: boolean;
}

export const Head = ({
  app,
  title,
  withEditor,
  withVendorScripts = true,
}: HeadProps) => {
  const { settings } = app;

  return (
    <head>
      <meta charset="utf-8" />
      <title>
        {settings.siteTitle} - {title}
      </title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content="Joongle is the ultimate CMS" />
      {withEditor && <meta http-equiv="Cache-Control" content="no-store" />}
      <link rel="stylesheet" href={cssFile} />
      {withVendorScripts && (
        <>
          <script src="/a/vendor/htmx.min.js" />
          <script src="/a/vendor/Sortable.min.js" />
        </>
      )}
    </head>
  );
};
