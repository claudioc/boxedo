import type { WithApp } from '~/../types';
import { Layout } from './Layout';

interface NotFoundProps extends WithApp {
  title: string;
}

export const NotFound = ({ app, title }: NotFoundProps) => {
  const { i18n } = app;

  return (
    <Layout app={app} title={title}>
      <h1 class="title">{i18n.t('NotFound.title')}</h1>
      <p>{i18n.t('NotFound.message')}</p>
    </Layout>
  );
};
