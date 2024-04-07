import { Layout } from './Layout';

interface NotFoundProps {
  title: string;
}

export const NotFound = ({ title }: NotFoundProps) => (
  <Layout title={title}>
    <h1 class="title">Page not found</h1>
    <p>The requested page was not found.</p>
  </Layout>
);
