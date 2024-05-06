import { PageModel } from '~/types';
import { Layout } from './Layout';
import { formatDate } from '~/lib/helpers';

interface PageHistoryProps {
  page: PageModel;
  history: PageModel[];
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
              <th>Last updated</th>
              <th>Title</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, index) => (
              <tr key={index}>
                <td>
                  {len - index} {item._rev}
                </td>
                <td>{formatDate(item.updatedAt, 'N/A')}</td>
                <td>{item.pageTitle}</td>
                <td>
                  <a
                    href={`/history/${page._id}/${index}`}
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
