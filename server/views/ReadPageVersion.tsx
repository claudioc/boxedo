import { Layout } from './Layout';
import { PageModel } from '~/types';
import { slugUrl } from '~/lib/helpers';
import { PageBody } from './components/PageBody';
import { formatDate } from '~/lib/helpers';

export interface ReadPageVersionProps {
  page: PageModel;
  item: PageModel;
  version: string;
}

export const ReadPageVersion = ({
  page,
  item,
  version,
}: ReadPageVersionProps) => (
  <Layout title={item.pageTitle} page={page}>
    <div>
      <div class="message is-info" role="alert" x-ref="message">
        <div class="message-header">
          <p>
            This is an older version (#{version.split('-')[0]}) of this page
          </p>
          <button
            class="delete"
            aria-label="delete"
            x-on:click="$refs.message.hidden = true"
          ></button>
        </div>
        <div class="message-body">
          <p>
            This version was last saved on{' '}
            <strong>{formatDate(item.updatedAt)}</strong> while the newest
            version is from <strong>{formatDate(page.updatedAt)}</strong>. You
            can view the current version following{' '}
            <a class="is-link" href={slugUrl(page.pageSlug)}>
              this link
            </a>
            , or you can go back to the{' '}
            <a href={`../${page._id}`}>list of all its versions</a>.
          </p>
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
