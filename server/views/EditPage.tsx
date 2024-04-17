import { Layout } from './Layout';
import { PageModel } from '~/types';
import { PageActions } from './components/PageActions';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { pageUrl } from '~/lib/helpers';
import { PageFormWrapper } from './components/PageFormWrapper';

export interface EditPageProps {
  page: PageModel;
}

export const EditPage = ({ page }: EditPageProps) => (
  <Layout hasMenu={false} title={`Editing ${page.pageTitle}`} page={page}>
    <PageFormWrapper title="Editing a page">
      <form
        action=""
        method="post"
        class="block"
        name="editPage"
        x-on:submit="App.validate"
        x-model="error"
      >
        <PageActions
          actions={['save', 'cancel']}
          cancelUrl={pageUrl(page.pageSlug)}
        />

        <div id="editor-placeholder" class="block content">
          <h1>{page.pageTitle}</h1>
          {page.pageContent}
        </div>

        <div class="block">
          <DebugInfo page={page} />
        </div>
      </form>

      <div class="level">
        <div class="level-item level-right">
          <button
            class="button is-danger is-light"
            id="delete-page-button"
            x-on:click="$refs.dialog.showModal()"
          >
            Delete this page
          </button>
        </div>
      </div>

      <dialog x-ref="dialog" class="card m-auto">
        <form method="dialog">
          <h2 class="title is-2">Delete this page?</h2>
          <p>
            Are you sure you want to delete this page? All its children pages
            will be moved to this page's parent.
          </p>
          <div class="level">
            <menu class="level-item level-right">
              <button
                class="button"
                value="default"
                x-on:click="window.onbeforeunload=null; $refs.deleteForm.submit()"
              >
                Yes, delete
              </button>
              <button class="button" value="cancel">
                No, cancel!
              </button>
            </menu>
          </div>
        </form>
      </dialog>

      <form x-ref="deleteForm" action="/delete" method="post">
        <input type="hidden" name="pageId" value={page.pageId} />
      </form>
    </PageFormWrapper>

    <EditorEnabler />
  </Layout>
);
