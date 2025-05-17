import type { WithCtx } from 'boxedo-core/types';
import { cssFile, htmxFile, sortableFile } from '~/lib/assets';
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
  const { settings, config, urlService } = ctx.app;

  return (
    <head>
      <meta charset="utf-8" />
      {/* The siteTitle never change, but the title of the page
      could change when we load a document via htmx; we also need
      the title pattern to build the full title from the js client  */}
      <title
        data-site-title={settings.siteTitle}
        data-title-pattern={config.BXD_TITLE_PATTERN}
      >
        {compilePageTitle(settings.siteTitle, title, config.BXD_TITLE_PATTERN)}
      </title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={settings.siteDescription} />
      {withEditor && <meta http-equiv="Cache-Control" content="no-store" />}
      <link rel="stylesheet" href={urlService.url(cssFile)} />
      {withVendorScripts && (
        <>
          <script src={urlService.url(htmxFile)} />
          <script src={urlService.url(sortableFile)} />
        </>
      )}
    </head>
  );
};
