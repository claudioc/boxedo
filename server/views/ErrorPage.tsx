import { Layout } from './Layout';
import { useApp } from '~/lib/context/App';

interface ErrorPageProps {
  title: string;
  error: Error | string;
}

export const ErrorPage = ({ title, error }: ErrorPageProps) => {
  const { i18n } = useApp();

  return (
    <Layout title={title}>
      <h1 class="title">{title}</h1>
      <p>{i18n.t('Error.requestFailed')}</p>
      <code>{error}</code>
    </Layout>
  );
};
