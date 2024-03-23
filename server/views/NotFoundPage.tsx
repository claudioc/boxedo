import { Layout } from './Layout';

interface NotFoundPageProps {
  title: string;
}

export const NotFoundPage = ({ title }: NotFoundPageProps) => (
  <Layout title={title}>
    <h2>Page not found</h2>
    <p>The requested page was not found.</p>
  </Layout>
);
