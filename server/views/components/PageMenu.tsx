interface PageMenuProps {
  cancelUrl: string;
}

export const PageMenu = ({ cancelUrl }: PageMenuProps) => (
  <menu class="col is-right">
    <button class="button primary" type="submit">
      Save and close
    </button>
    <a href={cancelUrl} class="button secondary outline">
      Cancel
    </a>
  </menu>
);
