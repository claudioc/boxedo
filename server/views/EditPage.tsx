import { Layout } from './Layout';
import { PageModel } from '../types';

export interface EditPageProps {
  page: PageModel;
}

export const EditPage = ({ page }: EditPageProps) => (
  <Layout
    hasMenu={false}
    title={`Editing ${page.pageTitle}`}
    pageId={page.pageId}
  >
    <h1>Editing a page</h1>
    <form action="" method="post">
      <nav class="nav">
        <div class="nav-right">
          <button class="button primary" type="submit">
            Save and close
          </button>
          <a href={`/page/${page.pageId}`} class="button outline">
            Cancel
          </a>
        </div>
      </nav>

      <div id="editor-placeholder">
        <h1>{page.pageTitle}</h1>
        {page.pageContent}
      </div>
      <input type="text" name="pageTitle" value={page.pageTitle} />
      <textarea name="pageContent">{page.pageContent}</textarea>
    </form>
    <script defer>App.enableEditor()</script>
  </Layout>
);
