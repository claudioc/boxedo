import { Layout } from './Layout';
import styles from './CreateIndex.module.css';

interface CreateIndexProps {
  title: string;
}

export const CreateIndex = ({ title }: CreateIndexProps) => (
  <Layout title={`Creating the home page`}>
    <form action="" method="post" className={styles.asd}>
      <button class="button primary" type="submit">
        Save and close
      </button>
      <div id="editor-placeholder">
        <h1>{title}</h1>
      </div>
      <input type="text" name="pageTitle" value={title} />
      <textarea name="pageContent"></textarea>
    </form>
    <script defer>App.enableEditor()</script>
  </Layout>
);
