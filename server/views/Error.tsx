import { Layout } from './Layout';

interface ErrorProps {
  title: string;
  error: Error | string;
}

export const Error = ({ title, error }: ErrorProps) => (
  <Layout title={title}>
    <h1 class="title">{title}</h1>
    <p>The request cannot be fullfilled.</p>
    <code>{error}</code>
  </Layout>
);
