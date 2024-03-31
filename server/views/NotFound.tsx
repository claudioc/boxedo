import { Layout } from './Layout';

interface NotFoundProps {
  title: string;
}

export const NotFound = ({ title }: NotFoundProps) => (
  <Layout title={title}>
    <h2>Page not found</h2>
    <p>The requested page was not found.</p>
  </Layout>
);
