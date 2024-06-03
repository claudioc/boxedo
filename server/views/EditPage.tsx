import { Layout } from './Layout';
import { PageModel } from '~/types';
import { PageActions } from './components/PageActions';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { slugUrl } from '~/lib/helpers';
import { PageFormWrapper } from './components/PageFormWrapper';
import { useApp } from '~/lib/context/App';

export interface EditPageProps {
  page: PageModel;
  token: string;
}

export const EditPage = ({ page, token }: EditPageProps) => {
  const { i18n } = useApp();

  return (
    <Layout
      title={i18n.t('EditPage.editingPage', { title: page.pageTitle })}
      page={page}
      useEditor
    >
      <PageFormWrapper title={i18n.t('EditPage.title')}>
        <form
          action=""
          method="post"
          class="block"
          name="editPage"
          x-on:submit="App.validate"
        >
          <input type="hidden" name="_csrf" value={token} />
          <input type="hidden" name="rev" value={page._rev} />

          <PageActions
            actions={['save', 'cancel']}
            cancelUrl={slugUrl(page.pageSlug)}
          />

          <button class="button is-small" x-on:click="App.addImage">
            {i18n.t('EditPage.addImage')}
          </button>
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
              {i18n.t('EditPage.deletePage')}
            </button>
          </div>
        </div>

        <dialog x-ref="dialog" class="card m-auto">
          <form method="dialog">
            <h2 class="title is-2">{i18n.t('EditPage.deletePageConfirm')}</h2>
            <p>{i18n.t('EditPage.deletePageWarning')}</p>
            <div class="level">
              <menu class="level-item level-right">
                <button
                  class="button"
                  value="default"
                  x-on:click="window.onbeforeunload=null; $refs.deleteForm.submit()"
                >
                  {i18n.t('EditPage.deletePageConfirmButton')}
                </button>
                <button class="button" value="cancel">
                  {i18n.t('EditPage.deletePageCancelButton')}
                </button>
              </menu>
            </div>
          </form>
        </dialog>

        <form x-ref="deleteForm" action="/delete" method="post">
          <input type="hidden" name="pageId" value={page._id} />
        </form>
      </PageFormWrapper>

      <EditorEnabler />
    </Layout>
  );
};
