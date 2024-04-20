import { PageHistoryItem, PageModel } from '~/types';
import { Layout } from './Layout';
import { formatDate } from '~/lib/helpers';

interface PageHistoryProps {
  page: PageModel;
  history: PageHistoryItem[];
}

export const PageHistory = ({ page, history }: PageHistoryProps) => {
  const len = history.length;
  return (
    <Layout title="Page history" page={page}>
      <h1 class="title">
        <span class="has-text-grey is-size-4">History of:</span>{' '}
        {page.pageTitle}
      </h1>
      {len === 0 ? (
        <p>No changes have been made to this page yet.</p>
      ) : (
        <table class="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              <th>Version</th>
              <th>Saved at</th>
              <th>Updated at</th>
              <th>Title</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, index) => (
              <tr key={index}>
                <td>{len - index}</td>
                <td>{formatDate(item.timestamp)}</td>
                <td>{formatDate(item.updateAt, 'N/A')}</td>
                <td>{item.pageTitle}</td>
                <td>
                  <a
                    href={`/history/${page.pageId}/${index}`}
                    class="button is-small"
                  >
                    View
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
