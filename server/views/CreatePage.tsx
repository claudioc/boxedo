import { Layout } from './Layout';
import type { PageModel } from '~/types';
import { PageActions } from './components/PageActions';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { slugUrl } from '~/lib/helpers';
import { PageFormWrapper } from './components/PageFormWrapper';
import { useApp } from '~/lib/context/App';

export interface CreatePageProps {
  parentPage: PageModel | null;
  token: string;
}

export const CreatePage = ({ parentPage, token }: CreatePageProps) => {
  const { i18n } = useApp();

  const titleKey = parentPage ? 'CreatePage.title' : 'CreatePage.titleTopLevel';

  return (
    <Layout
      title={i18n.t(titleKey)}
      page={parentPage}
      withEditor
      context="editing page"
    >
      <PageFormWrapper title={i18n.t(titleKey)}>
        <form
          action=""
          method="post"
          class="block"
          name="createPage"
          x-on:submit="App.validate"
        >
          <input type="hidden" name="_csrf" value={token} />

          <PageActions
            actions={['save', 'cancel']}
            cancelUrl={slugUrl(parentPage?.pageSlug || '/')}
          />

          <div id="editor-placeholder" class="block content" />

          <div class="block">
            <DebugInfo />
          </div>
        </form>
      </PageFormWrapper>
      <EditorEnabler />
    </Layout>
  );
};
