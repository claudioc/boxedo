import type { WithCtx } from '~/../types';
import { LayoutMini } from './LayoutMini';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { OhNoIcon } from './icons/OhNoIcon';

interface ErrorPageProps extends WithCtx {
  title: string;
  error: Error | string;
  goHome?: boolean;
}

export const ErrorPage = ({
  ctx,
  title,
  error,
  goHome = false,
}: ErrorPageProps) => {
  const { i18n } = ctx.app;
  return (
    <LayoutMini ctx={ctx} title={title}>
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
