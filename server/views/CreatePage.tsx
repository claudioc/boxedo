import type { PageModel, WithCtx } from '~/../types';
import { slugUrl } from '~/lib/helpers';
import { EditorEnabler } from './components/EditorEnabler';
import { MainContent } from './components/MainContent';
import { PageActions } from './components/PageActions';
import { PageData } from './components/PageData';
import { PageFormWrapper } from './components/PageFormWrapper';
import { Layout } from './Layout';

export interface CreatePageProps extends WithCtx {
  parentPage: PageModel | null;
  token: string;
}

export const CreatePage = ({ ctx, parentPage, token }: CreatePageProps) => {
  const { i18n } = ctx.app;

  const titleKey = parentPage ? 'CreatePage.title' : 'CreatePage.titleTopLevel';

  return (
    <Layout
      ctx={ctx}
      title={i18n.t(titleKey)}
      page={parentPage}
      withEditor
      context="editing page"
    >
      <PageFormWrapper ctx={ctx}>
        <form
          action=""
          method="post"
          class="mb-5"
          name="createPage"
          x-on:submit="App.validate"
        >
          <input type="hidden" name="_csrf" value={token} />

          <PageActions
            ctx={ctx}
            title={i18n.t(titleKey)}
            actions={['save', 'cancel']}
            cancelUrl={slugUrl(
              parentPage?.pageSlug || '/',
              ctx.app.config.JNGL_BASE_EXTERNAL_URL
            )}
          />

          <MainContent>
            <div id="js-editorPlaceholder" class="prose" />
          </MainContent>

          <PageData debug={ctx.app.is('development')} />
        </form>
      </PageFormWrapper>
      <EditorEnabler ctx={ctx} />
    </Layout>
  );
};
