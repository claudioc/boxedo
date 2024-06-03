import { useApp } from '~/lib/context/App';

type PageAction = 'save' | 'cancel';

interface PageActionsProps {
  actions: PageAction[];
  cancelUrl: string;
}

/**
 * The menu that shows up at the top of any form page (edit / create)
 */
export const PageActions = ({ actions, cancelUrl }: PageActionsProps) => {
  const { i18n } = useApp();

  return (
    <menu class="level level-right level-item">
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
  );
};
