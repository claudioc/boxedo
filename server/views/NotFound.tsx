import type { WithCtx } from '~/../types';
import { LayoutMini } from './LayoutMini';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { OhNoIcon } from './icons/OhNoIcon';

interface NotFoundProps extends WithCtx {
  title: string;
}

export const NotFound = ({ ctx, title }: NotFoundProps) => {
  const { i18n, urlService } = ctx.app;

  return (
    <LayoutMini ctx={ctx} title={title}>
      <div class="prose">
        <h2 class="flex gap-2 items-center">
          <OhNoIcon title={i18n.t('NotFound.title')} size={36} />
          {i18n.t('NotFound.title')}
        </h2>
        <p>{i18n.t('NotFound.message')}</p>
        <p>
          <a class="btn no-underline" href={urlService.url('/')}>
            <ArrowLeftIcon title={i18n.t('common.homePage')} />
            &nbsp;{i18n.t('common.homePage')}
          </a>
        </p>
      </div>
    </LayoutMini>
  );
};
