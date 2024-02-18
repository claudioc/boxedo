import { Layout } from './Layout';
import { PageProps } from '../types';

export const CreatePage = ({ title }: PageProps) => (
  <Layout title={title}>
    <button class="button primary" x-on:click="App.save()">
      Save and close
    </button>
    <textarea class="editor"></textarea>
    <script defer>App.enableEditor('.editor')</script>
  </Layout>
);
