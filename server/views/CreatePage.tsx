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
      <div class="row">
        <menu class="col is-right">
          <button class="button primary" type="submit">
            Save and close
          </button>
          <a
            href={`/page/${parentPage.pageId}`}
            class="button secondary outline"
          >
            Cancel
          </a>
        </menu>
      </div>

      <div class="row">
        <div class="col">
          <div id="editor-placeholder"></div>
        </div>
      </div>

      <div class="row">
        <div class="col">
          <details>
            <summary>Debug</summary>
            <input type="text" name="pageTitle" />
            <textarea name="pageContent"></textarea>
          </details>
        </div>
      </div>
    </form>
    <script defer>App.enableEditor()</script>
  </Layout>
);
