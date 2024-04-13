interface PageActionsProps {
  cancelUrl: string;
}

/**
 * The menu that shows up at the top of any form page (edit / create)
 */
export const PageActions = ({ cancelUrl }: PageActionsProps) => (
  <div class="level">
    <menu class="level-right level-item">
      <button class="button" type="submit">
        Save and close
      </button>
      <a
        href={cancelUrl}
        class="button"
        x-on:click="window.onbeforeunload=null"
      >
        Cancel
      </a>
    </menu>
  </div>
);
