import { Layout } from './Layout';
import { PageProps } from '../types';
// import styles from './CreateIndex.module.css';

export const CreateIndex = ({ title }: PageProps) => (
  <Layout title={`Creating the home page`}>
    <form action="" method="post">
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
