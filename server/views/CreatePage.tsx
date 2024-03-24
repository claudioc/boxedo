import { Layout } from './Layout';
import styles from './CreatePage.module.css';
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
    <form action="" method="post" className={styles.form}>
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
      <input type="text" name="pageTitle" />
      <textarea name="pageContent"></textarea>
    </form>
    <script defer>App.enableEditor()</script>
  </Layout>
);
