import { Layout } from './Layout';

interface ErrorPageProps {
  title: string;
  error: Error | string;
}

export const ErrorPage = ({ title, error }: ErrorPageProps) => (
  <Layout title={title}>
    <h2>Unhandled error</h2>
    <p>An unexpected error occurred.</p>
    <code>{error}</code>
  </Layout>
);
