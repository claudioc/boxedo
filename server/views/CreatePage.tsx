import { Layout } from './Layout';
import type { PageModel, WithApp } from '~/../types';
import { PageActions } from './components/PageActions';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { slugUrl } from '~/lib/helpers';
import { PageFormWrapper } from './components/PageFormWrapper';
import styles from './EditPage.module.css';

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

          <div class={styles.mainContent}>
            <div id="editor-placeholder" class="block content" />
          </div>
          <div class="block">
            <DebugInfo />
          </div>
        </form>
      </PageFormWrapper>
      <EditorEnabler />
    </Layout>
  );
};
