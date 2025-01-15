import { Layout } from './Layout';
import type { PageModel, WithApp } from '~/../types';
import { slugUrl } from '~/lib/helpers';
import { PageBody } from './components/PageBody';
import { formatDate } from '~/lib/helpers';
import { MainContent } from './components/MainContent';

export interface ReadPageVersionProps extends WithApp {
  page: PageModel;
  item: PageModel;
  version: string;
}

export const ReadPageVersion = ({
  app,
  page,
  item,
  version,
}: ReadPageVersionProps) => {
  const { i18n } = app;

  return (
    <Layout app={app} title={item.pageTitle} page={page}>
      <div>
        <div class="message is-info" x-ref="message">
          <div class="message-header">
            <p>
              {i18n.t('ReadPageVersion.oldVersion', {
                version: version.split('-')[0],
              })}
            </p>
            <button
              class="delete"
              aria-label="delete"
              x-on:click="$refs.message.hidden = true"
              type="button"
            />
          </div>
          <div class="message-body">
            <p>
              {i18n.t('ReadPageVersion.oldVersionInfo', {
                date: <strong>{formatDate(item.updatedAt)}</strong>,
                newDate: <strong>{formatDate(page.updatedAt)}</strong>,
                link: (
                  <a class="is-link" href={slugUrl(page.pageSlug)}>
                    {i18n.t('ReadPageVersion.thisLink')}
                  </a>
                ),
                historyLink: (
                  <a href={`../${page._id}`}>
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
          <PageBody title={item.pageTitle} body={item.pageContent} />
        </MainContent>
      </div>
    </Layout>
  );
};
