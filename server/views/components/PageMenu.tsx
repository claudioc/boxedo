interface PageMenuProps {
  cancelUrl: string;
}

export const PageMenu = ({ cancelUrl }: PageMenuProps) => (
  <menu class="col is-right">
    <button
      class="button primary"
      type="submit"
      x-on:click="window.onbeforeunload=null"
    >
      Save and close
    </button>
    <a
      href={cancelUrl}
      class="button secondary outline"
      x-on:click="window.onbeforeunload=null"
    >
      Cancel
    </a>
  </menu>
);
