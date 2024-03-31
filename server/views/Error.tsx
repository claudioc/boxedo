import { Layout } from './Layout';

interface ErrorProps {
  title: string;
  error: Error | string;
}

export const Error = ({ title, error }: ErrorProps) => (
  <Layout title={title}>
    <h2>{title}</h2>
    <p>The request cannot be fullfilled.</p>
    <code>{error}</code>
  </Layout>
);
