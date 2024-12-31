import type { PageModel } from '~/types';
import { useApp } from '~/lib/context/App';

interface PageMenuProps {
  page?: PageModel;
}

export const PageMenu = ({ page }: PageMenuProps) => {
  const { i18n } = useApp();

  if (!page) {
    return null;
  }

  return (
    <div class="dropdown is-right is-hoverable">
      <div class="dropdown-trigger">
        <button
          class="button"
          aria-haspopup="true"
          aria-controls="dropdown-menu"
          type="button"
        >
          <span>{i18n.t('PageMenu.actions')} …</span>
        </button>
      </div>
      <div class="dropdown-menu" id="dropdown-menu">
        <div class="dropdown-content">
          <a href={`/edit/${page._id}`} class="dropdown-item">
            {i18n.t('PageMenu.editThisPage')}
          </a>
          <a href={`/move/${page._id}`} class="dropdown-item">
            {i18n.t('PageMenu.moveThisPage')}
          </a>
          <a href={`/history/${page._id}`} class="dropdown-item">
            {i18n.t('PageMenu.pageHistory')}
          </a>
        </div>
      </div>
    </div>
  );
};
