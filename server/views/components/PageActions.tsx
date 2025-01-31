import type { WithApp } from '~/../types';
import { CancelIcon } from '../icons/CancelIcon';
import { SaveIcon } from '../icons/SaveIcon';

type PageAction = 'save' | 'cancel';

interface PageActionsProps extends WithApp {
  actions: PageAction[];
  cancelUrl: string;
  title: string;
}

/**
 * The menu that shows up at the top of any form page (edit / create)
 */
export const PageActions = ({
  app,
  actions,
  cancelUrl,
  title,
}: PageActionsProps) => {
  const { i18n } = app;

  return (
    <div class="level is-flex-direction-row">
      <div class=" level-left is-size-5">{title}</div>
      <menu class="level-right m-0 is-flex-direction-row">
        {actions.includes('save') && (
          <button class="button is-text-mobile" type="submit">
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
            class="button is-text-mobile"
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
