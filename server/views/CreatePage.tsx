import { Layout } from './Layout';
import { PageModel } from '~/types';
import { PageActions } from './components/PageActions';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { slugUrl } from '~/lib/helpers';
import { PageFormWrapper } from './components/PageFormWrapper';

export interface CreatePageProps {
  parentPage: PageModel;
  token: string;
}

export const CreatePage = ({ parentPage, token }: CreatePageProps) => (
  <Layout title="Creating a new page" page={parentPage} useEditor>
    <PageFormWrapper title="Creating a new page">
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
          cancelUrl={slugUrl(parentPage.pageSlug)}
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
