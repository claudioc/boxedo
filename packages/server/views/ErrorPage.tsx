import type { WithCtx } from 'boxedo-core/types';
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
  const { i18n, urlService } = ctx.app;
  return (
    <LayoutMini ctx={ctx} title={title}>
      <div class="prose">
        <h2 class="flex gap-2 items-center">
          <OhNoIcon title={title} size={36} />
          {title}
        </h2>
        <p>{i18n.t('Error.requestFailed')}</p>
        <p>
          <code>{String(error)}</code>
        </p>
        {goHome ? (
          <p>
            <a class="btn no-underline" href={urlService.url('/')}>
              <ArrowLeftIcon title={i18n.t('common.homePage')} />
              &nbsp;{i18n.t('common.homePage')}
            </a>
          </p>
        ) : (
          ''
        )}
      </div>
    </LayoutMini>
  );
};
