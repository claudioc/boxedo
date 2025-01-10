import type { WithApp } from '~/../types';
import { Layout } from './Layout';

interface ErrorPageProps extends WithApp {
  title: string;
  error: Error | string;
}

export const ErrorPage = ({ app, title, error }: ErrorPageProps) => {
  const { i18n } = app;
  return (
    <Layout app={app} title={title}>
      <h1 class="title">{title}</h1>
      <p>{i18n.t('Error.requestFailed')}</p>
      <code>{String(error)}</code>
    </Layout>
  );
};
