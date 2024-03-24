import { Layout } from './Layout';
import { PageModel } from '../types';

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
      <nav class="nav">
        <div class="nav-right">
          <button class="button primary" type="submit">
            Save and close
          </button>
          <a href={`/page/${parentPage.pageId}`} class="button outline">
            Cancel
          </a>
        </div>
      </nav>
      <div id="editor-placeholder"></div>
      <details>
        <summary>Debug</summary>
        <input type="text" name="pageTitle" />
        <textarea name="pageContent"></textarea>
      </details>
    </form>
    <script defer>App.enableEditor()</script>
  </Layout>
);
