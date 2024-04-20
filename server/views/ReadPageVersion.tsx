import { Layout } from './Layout';
import { PageHistoryItem, PageModel } from '~/types';
import { formatDate, slugUrl } from '~/lib/helpers';
import { PageBody } from './components/PageBody';

export interface ReadPageVersionProps {
  page: PageModel;
  item: PageHistoryItem;
  version: number;
}

export const ReadPageVersion = ({
  page,
  item,
  version,
}: ReadPageVersionProps) => (
  <Layout title={item.pageTitle} page={page}>
    <div>
      <div class="message is-info" role="alert">
        <p class="message-header">Viewing an older version</p>
        <div class="message-body">
          This is an older version (#{version}) of this page. This version was
          made obsolete on <strong>{formatDate(item.timestamp)}</strong>. You
          can view the current version following{' '}
          <a class="is-link" href={slugUrl(page.pageSlug)}>
            this link
          </a>
          , or you can go back to the{' '}
          <a href={`../${page.pageId}`}>list of all its versions</a>.
          <details>
            <summary>More …</summary>
            <p>
              The history only reports changes to the page content and title.
              Change on the page's authorship or hierarchy are not tracked at
              this time.
            </p>
          </details>
        </div>
      </div>
      <PageBody page={item} />
    </div>
  </Layout>
);
