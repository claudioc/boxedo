interface PageMenuProps {
  cancelUrl: string;
}

export const PageMenu = ({ cancelUrl }: PageMenuProps) => (
  <div class="level">
    <menu class="level-right level-item">
      <button
        class="button"
        type="submit"
        x-on:click="window.onbeforeunload=null"
      >
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
