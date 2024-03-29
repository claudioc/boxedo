import { Layout } from './Layout';
import { PageModel } from '../types';
import { PageMenu } from './components/PageMenu';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';

export interface CreatePageProps {
  parentPage: PageModel;
}

export const CreatePage = ({ parentPage }: CreatePageProps) => (
  <Layout
    hasMenu={false}
    title="Creating a new page"
    pageId={parentPage.pageId}
  >
    <h1>Creating a new page</h1>
    <form action="" method="post">
      <div class="row">
        <PageMenu cancelUrl={`/page/${parentPage.pageId}`} />
      </div>

      <div class="row">
        <div class="col">
          <div id="editor-placeholder"></div>
        </div>
      </div>

      <div class="row">
        <DebugInfo />
      </div>
    </form>

    <EditorEnabler />
  </Layout>
);
