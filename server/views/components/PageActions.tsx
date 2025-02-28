import type { WithCtx } from '~/../types';
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
 */
export const PageActions = ({
  ctx,
  actions,
  cancelUrl,
  title,
}: PageActionsProps) => {
  const { i18n } = ctx.app;

  return (
    <div class="level is-flex-direction-row">
      <div class=" level-left is-size-5">{title}</div>
      <menu class="level-right m-0 is-flex-direction-row">
        {actions.includes('save') && (
          <button
            class="button is-text-mobile is-primary is-outlined is-small"
            type="submit"
            x-bind:disabled="$store.form.submitting"
            x-on:click="setTimeout(() => $store.form.submitting = true, 1)"
          >
            <span class="is-hidden-mobile">
              {i18n.t('PageActions.saveAndClose')}
            </span>
            <span class="is-hidden-tablet">
              <SaveIcon title={i18n.t('PageActions.saveAndClose')} />
            </span>
          </button>
        )}
        {actions.includes('cancel') && (
          <a
            href={cancelUrl}
            class="button is-text-mobile is-danger is-outlined is-small"
            x-bind:disabled="$store.form.submitting"
            x-on:click="window.onbeforeunload=null"
          >
            <span class="is-hidden-mobile">{i18n.t('PageActions.cancel')}</span>
            <span class="is-hidden-tablet">
              <CancelIcon title={i18n.t('PageActions.cancel')} />
            </span>
          </a>
        )}
      </menu>
    </div>
  );
};
