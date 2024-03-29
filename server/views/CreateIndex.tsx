import { Layout } from './Layout';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { PageMenu } from './components/PageMenu';

interface CreateIndexProps {
  title: string;
}

export const CreateIndex = ({ title }: CreateIndexProps) => (
  <Layout title={`Creating the home page`} hasMenu={false}>
    <h1>Creating the home page</h1>
    <form action="" method="post">
      <div class="row">
        <PageMenu cancelUrl="/" />
      </div>

      <div id="editor-placeholder">
        <h1>{title}</h1>
      </div>

      <div class="row">
        <div class="col">
          <input type="text" name="pageTitle" value={title} />
          <textarea name="pageContent"></textarea>
        </div>
      </div>

      <div class="row">
        <DebugInfo />
      </div>
    </form>

    <EditorEnabler />
  </Layout>
);
