import { Layout } from './Layout';

interface CreateIndexProps {
  title: string;
}

export const CreateIndex = ({ title }: CreateIndexProps) => (
  <Layout title={`Creating the home page`} hasMenu={false}>
    <h1>Creating the home page</h1>
    <form action="" method="post">
      <nav class="nav">
        <div class="nav-right">
          <button class="button primary" type="submit">
            Save and close
          </button>
          <a href="/" class="button outline">
            Cancel
          </a>
        </div>
      </nav>
      <div id="editor-placeholder">
        <h1>{title}</h1>
      </div>
      <input type="text" name="pageTitle" value={title} />
      <textarea name="pageContent"></textarea>
    </form>
    <script defer>App.enableEditor()</script>
  </Layout>
);
