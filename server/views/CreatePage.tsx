import { Layout } from './Layout';
import { PageModel } from '../types';
import { PageMenu } from './components/PageMenu';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { pageUrl } from '../lib/helpers';
import { Feedback } from './components/Feedback';
import { Feedbacks } from '../lib/feedbacks';

export interface CreatePageProps {
  parentPage: PageModel;
}

export const CreatePage = ({ parentPage }: CreatePageProps) => (
  <Layout
    hasMenu={false}
    title="Creating a new page"
    pageId={parentPage.pageId}
  >
    <script>
      {`
       function getData() {
        return {
          formData: {
            pageTitle: '',
            pageContent: '',
          },
        };
      }

    `}
    </script>

    <div
      x-data="getData()"
      x-init="window.onbeforeunload=function() { return true };"
    >
      <h1 class="subtitle">Creating a new page</h1>

      <div x-show="formData.pageTitle.length == 0">
        <Feedback feedback={Feedbacks.E_EMPTY_TITLE} />
      </div>

      <form action="" method="post" class="block">
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
