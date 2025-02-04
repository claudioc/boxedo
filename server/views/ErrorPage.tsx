import type { WithApp } from '~/../types';
import { LayoutMini } from './LayoutMini';
import { OhNoIcon } from './icons/OhNoIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface ErrorPageProps extends WithApp {
  title: string;
  error: Error | string;
  goHome?: boolean;
}

export const ErrorPage = ({
  app,
  title,
  error,
  goHome = false,
}: ErrorPageProps) => {
  const { i18n } = app;
  return (
    <LayoutMini app={app} title={title}>
      <h1 class={['title', 'level', 'is-justify-content-start']}>
        <OhNoIcon title={title} size={48} />
        {title}
      </h1>
      <p class="block">{i18n.t('Error.requestFailed')}</p>
      <p class="block">
        <code>{String(error)}</code>
      </p>
      {goHome ? (
        <p class="block">
          <a class="button" href="/">
            <ArrowLeftIcon title={'Back home'} />
            &nbsp;Home
          </a>
        </p>
      ) : (
        ''
      )}
    </LayoutMini>
  );
};
