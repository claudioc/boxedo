import { Layout } from './Layout';
import { useApp } from '~/lib/context/App';

interface NotFoundProps {
  title: string;
}

export const NotFound = ({ title }: NotFoundProps) => {
  const { i18n } = useApp();

  return (
    <Layout title={title}>
      <h1 class="title">{i18n.t('NotFound.title')}</h1>
      <p>{i18n.t('NotFound.message')}</p>
    </Layout>
  );
};
