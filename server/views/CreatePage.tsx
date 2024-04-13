import { Layout } from './Layout';
import { PageModel } from '../types';
import { PageMenu } from './components/PageMenu';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { pageUrl } from '../lib/helpers';
import { Feedback, Feedbacks } from './components/Feedback';

export interface CreatePageProps {
  parentPage: PageModel;
}

export const CreatePage = ({ parentPage }: CreatePageProps) => (
  <Layout
    hasMenu={false}
    title="Creating a new page"
    pageId={parentPage.pageId}
  >
    <div
      x-data="{error: { pageTitle: false, pageContent: false }}"
      x-init="window.onbeforeunload=function() { return true };"
    >
      <h1 class="subtitle">Creating a new page</h1>

      <div>
        <div x-show="error && error.pageTitle" class="block">
          <Feedback feedback={Feedbacks.E_EMPTY_TITLE} />
        </div>

        <div x-show="error && error.pageContent" class="block">
          <Feedback feedback={Feedbacks.E_EMPTY_CONTENT} />
        </div>
      </div>

      <form
        action=""
        method="post"
        class="block"
        x-on:submit="App.validate"
        x-model="error"
      >
        <PageMenu cancelUrl={pageUrl(parentPage.pageSlug)} />

        <div id="editor-placeholder" class="block content"></div>

        <div class="block">
          <DebugInfo />
        </div>
      </form>
    </div>
    <EditorEnabler />
  </Layout>
);
