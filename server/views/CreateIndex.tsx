import { Layout } from './Layout';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { PageMenu } from './components/PageMenu';

interface CreateIndexProps {
  title: string;
}

export const CreateIndex = ({ title }: CreateIndexProps) => (
  <Layout title={`Creating the home page`} hasMenu={false}>
    <h1 class="subtitle">Creating the home page</h1>
    <form action="" method="post">
      <PageMenu cancelUrl="/" />

      <div id="editor-placeholder content block">
        <h1>{title}</h1>
      </div>

      <div class="block">
        <DebugInfo />
      </div>
    </form>

    <EditorEnabler />
  </Layout>
);
