import type { WithCtx } from '~/../types';
import { cssFile } from '~/lib/assets';
import { compilePageTitle } from '~/lib/helpers';

interface HeadProps extends WithCtx {
  title: string;
  withEditor: boolean;
  withVendorScripts?: boolean;
}

export const Head = ({
  ctx,
  title,
  withEditor,
  withVendorScripts = true,
}: HeadProps) => {
  const { settings, config } = ctx.app;

  return (
    <head>
      <meta charset="utf-8" />
      {/* The siteTitle never change, but the title of the page
      could change when we load a document via htmx; we also need
      the title pattern to build the full title from the js client  */}
      <title
        data-site-title={settings.siteTitle}
        data-title-pattern={config.JNGL_TITLE_PATTERN}
      >
        {compilePageTitle(settings.siteTitle, title, config.JNGL_TITLE_PATTERN)}
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
