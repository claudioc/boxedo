import { Layout } from './Layout';
import type { PageModel, WithApp } from '~/../types';
import { PageActions } from './components/PageActions';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { PageFormWrapper } from './components/PageFormWrapper';
import { slugUrl } from '~/lib/helpers';
import { MainContent } from './components/MainContent';

export interface EditPageProps extends WithApp {
  page: PageModel;
  token: string;
}

export const EditPage = ({ app, page, token }: EditPageProps) => {
  const { i18n } = app;

  return (
    <Layout
      app={app}
      title={i18n.t('EditPage.editingPage', { title: page.pageTitle })}
      page={page}
      withEditor
      context="editing page"
    >
      <PageFormWrapper app={app}>
        <form action="" method="post" class="block" x-on:submit="App.validate">
          <input type="hidden" name="_csrf" value={token} />
          <input type="hidden" name="rev" value={page._rev} />

          <PageActions
            app={app}
            actions={['save', 'cancel']}
            cancelUrl={slugUrl(page.pageSlug)}
            title={i18n.t('EditPage.title')}
          />

          {/* <button
            type="button"
            class="button is-small"
            x-on:click="App.addImage"
          >
            {i18n.t('EditPage.addImage')}
          </button> */}
          <MainContent>
            <div id="editor-placeholder" class="block content">
              <h1>{page.pageTitle}</h1>
              {page.pageContent}
            </div>

            <div class="block">
              <DebugInfo page={page} />
            </div>
          </MainContent>
        </form>

        <div class="level">
          <div class="level-item level-right">
            <button
              type="button"
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
                  type="button"
                  class="button"
                  value="default"
                  x-on:click="window.onbeforeunload=null; $refs.deleteForm.submit()"
                >
                  {i18n.t('EditPage.deletePageConfirmButton')}
                </button>
                <button
                  type="button"
                  class="button"
                  value="cancel"
                  x-on:click="$refs.dialog.close()"
                >
                  {i18n.t('EditPage.deletePageCancelButton')}
                </button>
              </menu>
            </div>
          </form>
        </dialog>

        <form
          x-ref="deleteForm"
          action={`/pages/${page._id}/delete`}
          method="post"
        />
      </PageFormWrapper>

      <EditorEnabler />
    </Layout>
  );
};
