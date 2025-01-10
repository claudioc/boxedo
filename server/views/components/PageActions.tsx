import type { WithApp } from '~/../types';

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
          <button class="button" type="submit">
            {i18n.t('PageActions.saveAndClose')}
          </button>
        )}
        {actions.includes('cancel') && (
          <a
            href={cancelUrl}
            class="button"
            x-on:click="window.onbeforeunload=null"
          >
            {i18n.t('PageActions.cancel')}
          </a>
        )}
      </menu>
    </div>
  );
};
