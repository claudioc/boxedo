import { Layout } from './Layout';
import { DebugInfo } from './components/DebugInfo';
import { EditorEnabler } from './components/EditorEnabler';
import { PageMenu } from './components/PageMenu';
import { PageFormWrapper } from './components/PageFormWrapper';

interface CreateIndexProps {
  title: string;
}

export const CreateIndex = ({ title }: CreateIndexProps) => (
  <Layout title={`Creating the home page`} hasMenu={false}>
    <PageFormWrapper title="Creating the home page">
      <form
        action=""
        method="post"
        class="block"
        x-on:submit="App.validate"
        x-model="error"
      >
        <PageMenu cancelUrl="/" />

        <div id="editor-placeholder content block">
          <h1>{title}</h1>
        </div>

        <div class="block">
          <DebugInfo />
        </div>
      </form>
    </PageFormWrapper>

    <EditorEnabler />
  </Layout>
);
