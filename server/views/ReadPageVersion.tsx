import type { PageModel, WithCtx } from '~/../types';
import { formatDate, slugUrl } from '~/lib/helpers';
import { MainContent } from './components/MainContent';
import { PageBody } from './components/PageBody';
import { Layout } from './Layout';

export interface ReadPageVersionProps extends WithCtx {
  page: PageModel;
  item: PageModel;
  version: string;
}

export const ReadPageVersion = ({
  ctx,
  page,
  item,
  version,
}: ReadPageVersionProps) => {
  const { i18n } = ctx.app;

  return (
    <Layout ctx={ctx} title={item.pageTitle} page={page}>
      <div>
        {/* biome-ignore lint/a11y/useSemanticElements: */}
        <div
          role="alert"
          class="card bg-info text-info-content mb-5 opacity-60"
        >
          <div class="card-body">
            <div class="card-title">
              {i18n.t('ReadPageVersion.oldVersion', {
                version: version.split('-')[0],
              })}
            </div>
            <p>
              {i18n.t('ReadPageVersion.oldVersionInfo', {
                date: <strong>{formatDate(item.updatedAt)}</strong>,
                newDate: <strong>{formatDate(page.updatedAt)}</strong>,
                link: (
                  <a class="link" href={slugUrl(page.pageSlug)}>
                    {i18n.t('ReadPageVersion.thisLink')}
                  </a>
                ),
                historyLink: (
                  <a class="link" href="../history">
                    {i18n.t('ReadPageVersion.listOfVersions')}
                  </a>
                ),
              })}
            </p>
            <details>
              <summary>{i18n.t('ReadPageVersion.more')}</summary>
              <p>{i18n.t('ReadPageVersion.moreInfo')}</p>
            </details>
          </div>
        </div>
        <MainContent>
          <PageBody ctx={ctx} title={item.pageTitle} body={item.pageContent} />
        </MainContent>
      </div>
    </Layout>
  );
};
