import type { PageModel, WithCtx } from '~/../types';
import { EditorEnabler } from './components/EditorEnabler';
import { MainContent } from './components/MainContent';
import { PageActions } from './components/PageActions';
import { PageData } from './components/PageData';
import { PageFormWrapper } from './components/PageFormWrapper';
import { Layout } from './Layout';

export interface EditPageProps extends WithCtx {
  page: PageModel;
  token: string;
}

export const EditPage = ({ ctx, page, token }: EditPageProps) => {
  const { i18n, urlService } = ctx.app;

  return (
    <Layout
      ctx={ctx}
      title={i18n.t('EditPage.editingPage', { title: page.pageTitle })}
      page={page}
      withEditor
      context="editing page"
    >
      <PageFormWrapper ctx={ctx}>
        <form action="" method="post" class="mb-5" x-on:submit="App.validate">
          <input type="hidden" name="_csrf" value={token} />
          <input type="hidden" name="rev" value={page._rev} />
          <PageActions
            ctx={ctx}
            actions={['save', 'cancel']}
            cancelUrl={urlService.slugUrl(page.pageSlug)}
            title={i18n.t('EditPage.title')}
          />
          <MainContent>
            <div id="js-editorPlaceholder" class="prose">
              <h1>{page.pageTitle}</h1>
              {page.pageContent}
            </div>
          </MainContent>
          <PageData page={page} debug={ctx.app.is('development')} />
        </form>

        <div class="flex justify-end">
          <button
            type="button"
            class="btn btn-warning btn-outline btn-sm"
            id="delete-page-button"
            x-on:click="$refs.dialog.showModal()"
          >
            {i18n.t('EditPage.deletePage')}
          </button>
        </div>

        {/* Delete page confirmation dialog */}
        <dialog x-ref="dialog" class="modal">
          <div class="modal-box prose">
            <h3>{i18n.t('EditPage.deletePageConfirm')}</h3>
            <p>{i18n.t('EditPage.deletePageWarning')}</p>
            <form method="dialog">
              <menu class="flex justify-end gap-3">
                <button
                  type="button"
                  class="btn btn-primary"
                  value="default"
                  x-on:click="window.onbeforeunload=null; $refs.deleteForm.submit()"
                >
                  {i18n.t('EditPage.deletePageConfirmButton')}
                </button>
                <button
                  type="button"
                  class="btn"
                  value="cancel"
                  x-on:click="$refs.dialog.close()"
                >
                  {i18n.t('EditPage.deletePageCancelButton')}
                </button>
              </menu>
            </form>
          </div>
        </dialog>

        <form
          x-ref="deleteForm"
          action={`/pages/${page._id}/delete`}
          method="post"
        >
          <input type="hidden" name="_csrf" value={token} />
        </form>
      </PageFormWrapper>
      <EditorEnabler ctx={ctx} />
    </Layout>
  );
};
