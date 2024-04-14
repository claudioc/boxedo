import { Layout } from './Layout';
import { PageModel } from '~/types';
import { PageActions } from './components/PageActions';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { pageUrl } from '~/lib/helpers';
import { PageFormWrapper } from './components/PageFormWrapper';

export interface CreatePageProps {
  parentPage: PageModel;
}

export const CreatePage = ({ parentPage }: CreatePageProps) => (
  <Layout
    hasMenu={false}
    title="Creating a new page"
    pageId={parentPage.pageId}
  >
    <PageFormWrapper title="Creating a new page">
      <form
        action=""
        method="post"
        class="block"
        name="createPage"
        x-on:submit="App.validate"
        x-model="error"
      >
        <PageActions
          actions={['save', 'cancel']}
          cancelUrl={pageUrl(parentPage.pageSlug)}
        />

        <div id="editor-placeholder" class="block content"></div>

        <div class="block">
          <DebugInfo />
        </div>
      </form>
    </PageFormWrapper>
    <EditorEnabler />
  </Layout>
);
