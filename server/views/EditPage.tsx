import { Layout } from './Layout';
import { PageModel } from '../types';
import { PageMenu } from './components/PageMenu';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { pageUrl } from '../lib/helpers';

export interface EditPageProps {
  page: PageModel;
}

export const EditPage = ({ page }: EditPageProps) => (
  <Layout
    hasMenu={false}
    title={`Editing ${page.pageTitle}`}
    pageId={page.pageId}
  >
    <div x-data>
      <h1>Editing a page</h1>
      <form action="" method="post">
        <div class="row">
          <PageMenu cancelUrl={pageUrl(page.pageSlug)} />
        </div>

        <div class="row">
          <div class="col">
            <div id="editor-placeholder">
              <h1>{page.pageTitle}</h1>
              {page.pageContent}
            </div>
          </div>
        </div>

        <div class="row">
          <DebugInfo page={page} />
        </div>
      </form>

      <div class="row">
        <div class="col is-right">
          <button
            class="button error"
            id="delete-page-button"
            x-on:click="$refs.dialog.showModal()"
          >
            Delete this page
          </button>
        </div>
      </div>

      <dialog x-ref="dialog">
        <form method="dialog">
          <h1>Delete this page?</h1>
          <p>
            Are you sure you want to delete this page? All its children pages
            will be moved to this page's parent.
          </p>
          <menu class="is-right">
            <button
              class="button primary"
              value="default"
              x-on:click="$refs.deleteForm.submit()"
            >
              Yes, delete
            </button>
            <button class="button secondary" value="cancel">
              No, cancel!
            </button>
          </menu>
        </form>
      </dialog>

      <form x-ref="deleteForm" action="/delete" method="post">
        <input type="hidden" name="pageId" value={page.pageId} />
      </form>
    </div>

    <EditorEnabler />
  </Layout>
);
