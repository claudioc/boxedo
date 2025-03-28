import type { PageModel, WithCtx } from '~/../types';
import { formatDate } from '~/lib/helpers';
import { Layout } from './Layout';

interface PageHistoryProps extends WithCtx {
  page: PageModel;
  history: PageModel[];
}

export const PageHistory = ({ ctx, page, history }: PageHistoryProps) => {
  const { i18n } = ctx.app;
  const len = history.length;

  return (
    <Layout ctx={ctx} title="Page history" page={page}>
      <div class="prose">
        <h2 class="mb-5">
          <span class="text-gray-400">{i18n.t('PageHistory.historyOf')}:</span>
          &nbsp;
          {page.pageTitle}
        </h2>
      </div>
      {len === 0 ? (
        <p class="mb-5">{i18n.t('PageHistory.noChanges')}</p>
      ) : (
        <table class="table table-zebra table-pin-rows">
          <thead>
            <tr>
              <th>{i18n.t('PageHistory.versionLabel')}</th>
              <th>{i18n.t('PageHistory.lastUpdatedLabel')}</th>
              <th>{i18n.t('PageHistory.updatedByLabel')}</th>
              <th>{i18n.t('PageHistory.titleLabel')}</th>
              <th>{i18n.t('PageHistory.actionsLabel')}</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr>
                <td>{item._rev?.split('-')[0]}</td>
                <td>{formatDate(item.updatedAt, ctx.prefs.siteLang, 'N/A')}</td>
                <td>{item.updatedBy}</td>
                <td>{item.pageTitle}</td>
                <td>
                  <a
                    href={`/pages/${page._id}/history/${item._rev}`}
                    class="btn btn-sm btn-outline"
                  >
                    {i18n.t('PageHistory.viewLabel')}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  );
};
