import type { WithCtx } from '~/../types';
import { LayoutMini } from './LayoutMini';
import { OhNoIcon } from './icons/OhNoIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface NotFoundProps extends WithCtx {
  title: string;
}

export const NotFound = ({ ctx, title }: NotFoundProps) => {
  const { i18n } = ctx.app;

  return (
    <LayoutMini ctx={ctx} title={title}>
      <h1 class={['title', 'level', 'is-justify-content-start']}>
        <OhNoIcon title={i18n.t('NotFound.title')} size={48} />
        {i18n.t('NotFound.title')}
      </h1>
      <p class="block">{i18n.t('NotFound.message')}</p>
      <p class="block">
        <a class="button" href="/">
          <ArrowLeftIcon title={'Back home'} />
          &nbsp;Home
        </a>
      </p>
    </LayoutMini>
  );
};
