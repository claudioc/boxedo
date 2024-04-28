type PageAction = 'save' | 'cancel';

interface PageActionsProps {
  actions: PageAction[];
  cancelUrl: string;
}

/**
 * The menu that shows up at the top of any form page (edit / create)
 */
export const PageActions = ({ actions, cancelUrl }: PageActionsProps) => (
  <menu class="level level-right level-item">
    {actions.includes('save') && (
      <button class="button" type="submit">
        Save and close
      </button>
    )}
    {actions.includes('cancel') && (
      <a
        href={cancelUrl}
        class="button"
        x-on:click="window.onbeforeunload=null"
      >
        Cancel
      </a>
    )}
  </menu>
);
