import { Layout } from './Layout';

interface ErrorPageProps {
  title: string;
  error: Error | string;
}

export const ErrorPage = ({ title, error }: ErrorPageProps) => (
  <Layout title={title}>
    <h2>{title}</h2>
    <p>The request cannot be fullfilled.</p>
    <code>{error}</code>
  </Layout>
);
