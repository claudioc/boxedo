import { Layout } from './Layout';
import type { PageModel, WithApp } from '~/../types';
import { PageActions } from './components/PageActions';
import { PageData } from './components/PageData';
import { EditorEnabler } from './components/EditorEnabler';
import { slugUrl } from '~/lib/helpers';
import { PageFormWrapper } from './components/PageFormWrapper';
import { MainContent } from './components/MainContent';

export interface CreatePageProps extends WithApp {
  parentPage: PageModel | null;
  token: string;
}

export const CreatePage = ({ app, parentPage, token }: CreatePageProps) => {
  const { i18n } = app;

  const titleKey = parentPage ? 'CreatePage.title' : 'CreatePage.titleTopLevel';

  return (
    <Layout
      app={app}
      title={i18n.t(titleKey)}
      page={parentPage}
      withEditor
      context="editing page"
    >
      <PageFormWrapper app={app}>
        <form
          action=""
          method="post"
          class="block"
          name="createPage"
          x-on:submit="App.validate"
        >
          <input type="hidden" name="_csrf" value={token} />

          <PageActions
            app={app}
            title={i18n.t(titleKey)}
            actions={['save', 'cancel']}
            cancelUrl={slugUrl(parentPage?.pageSlug || '/')}
          />

          <MainContent>
            <div id="editor-placeholder" class="block content" />
          </MainContent>

          <PageData debug={app.is('development')} />
        </form>
      </PageFormWrapper>
      <EditorEnabler app={app} />
    </Layout>
  );
};
