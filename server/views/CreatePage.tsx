import { Layout } from './Layout';
// import { PageProps } from '../types';
import styles from './CreatePage.module.css';

export const CreatePage = () => (
  <Layout title={`Creating a new page`}>
    <form action="" method="post" className={styles.form}>
      <button class="button primary" type="submit">
        Save and close
      </button>
      <div id="editor-placeholder"></div>
      <input type="text" name="pageTitle" />
      <textarea name="pageContent"></textarea>
    </form>
    <script defer>App.enableEditor()</script>
  </Layout>
);
