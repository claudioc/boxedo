import type { WithCtx } from 'boxedo-core/types';
import { CancelIcon } from '../icons/CancelIcon';
import { SaveIcon } from '../icons/SaveIcon';

type PageAction = 'save' | 'cancel';

interface PageActionsProps extends WithCtx {
  actions: PageAction[];
  cancelUrl: string;
  title: string;
}

/**
 * The menu that shows up at the top of any form page (edit / create)
 *
 * We are not checking for capabilities here, as the page is not accessible to unauthorized users.
 */
export const PageActions = ({
  ctx,
  actions,
  cancelUrl,
  title,
}: PageActionsProps) => {
  const { i18n } = ctx.app;

  return (
    <div class="text-sm flex justify-between items-center mb-5">
      <h2 class="text-2xl">{title}</h2>
      <menu class="flex gap-3">
        {actions.includes('save') && (
          <button
            class="btn btn-primary btn-sm"
            type="submit"
            x-bind:disabled="$store.form.submitting"
            x-on:click="setTimeout(() => $store.form.submitting = true, 1)"
          >
            <span class="hidden md:block">
              {i18n.t('PageActions.saveAndClose')}
            </span>
            <span class="block md:hidden">
              <SaveIcon title={i18n.t('PageActions.saveAndClose')} />
            </span>
          </button>
        )}
        {actions.includes('cancel') && (
          <a
            href={cancelUrl}
            class="btn btn-sm"
            x-bind:disabled="$store.form.submitting"
            x-on:click="window.onbeforeunload=null"
          >
            <span class="hidden md:block">{i18n.t('PageActions.cancel')}</span>
            <span class="block md:hidden">
              <CancelIcon title={i18n.t('PageActions.cancel')} />
            </span>
          </a>
        )}
      </menu>
    </div>
  );
};
