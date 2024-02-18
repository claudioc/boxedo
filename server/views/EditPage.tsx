import { Layout } from './Layout';
import { PageProps } from '../types';

export const EditPage = ({ title, content }: PageProps) => (
  <Layout title={`Editing ${title}`}>
    <form action="" method="post">
      <button class="button primary" type="submit">
        Save and close
      </button>
      <div id="editor-placeholder">
        <h1>{title}</h1>
        {content}
      </div>
      <input type="text" name="pageTitle" value={title} />
      <textarea name="pageContent">{content}</textarea>
    </form>
    <script defer>App.enableEditor()</script>
  </Layout>
);
