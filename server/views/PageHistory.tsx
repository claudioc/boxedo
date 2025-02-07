import type { PageModel, WithCtx } from '~/../types';
import { Layout } from './Layout';
import { formatDate } from '~/lib/helpers';

interface PageHistoryProps extends WithCtx {
  page: PageModel;
  history: PageModel[];
}

export const PageHistory = ({ ctx, page, history }: PageHistoryProps) => {
  const { i18n } = ctx.app;
  const len = history.length;

  return (
    <Layout ctx={ctx} title="Page history" page={page}>
      <h1 class="title">
        <span class="has-text-grey is-size-4">
          {i18n.t('PageHistory.historyOf')}:
        </span>{' '}
        {page.pageTitle}
      </h1>
      {len === 0 ? (
        <p>{i18n.t('PageHistory.noChanges')}</p>
      ) : (
        <table class="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              <th>{i18n.t('PageHistory.versionLabel')}</th>
              <th>{i18n.t('PageHistory.lastUpdatedLabel')}</th>
              <th>{i18n.t('PageHistory.titleLabel')}</th>
              <th>{i18n.t('PageHistory.actionsLabel')}</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr>
                <td>{item._rev?.split('-')[0]}</td>
                <td>{formatDate(item.updatedAt, 'N/A')}</td>
                <td>{item.pageTitle}</td>
                <td>
                  <a
                    href={`/pages/${page._id}/history/${item._rev}`}
                    class="button is-small"
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
