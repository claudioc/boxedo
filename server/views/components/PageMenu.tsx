import type { PageModel, WithCtx } from '~/../types';
import { EllipsisIcon } from '../icons/EllipsisIcon';

interface PageMenuProps extends WithCtx {
  page?: PageModel;
}

export const PageMenu = ({ ctx, page }: PageMenuProps) => {
  const { i18n } = ctx.app;

  if (!page) {
    return null;
  }

  return (
    <div class="dropdown is-right is-hoverable">
      <div class="dropdown-trigger">
        <button
          class="button is-text-mobile"
          aria-haspopup="true"
          aria-controls="dropdown-menu"
          type="button"
        >
          <span class="is-hidden-mobile">{i18n.t('PageMenu.actions')} …</span>
          <span class="is-hidden-tablet">
            <EllipsisIcon title={i18n.t('PageMenu.actions')} />
          </span>
        </button>
      </div>
      <div class="dropdown-menu" id="dropdown-menu">
        <div class="dropdown-content">
          <a href={`/pages/${page._id}/edit`} class="dropdown-item">
            {i18n.t('PageMenu.editThisPage')}
          </a>
          <a href={`/pages/${page._id}/move`} class="dropdown-item">
            {i18n.t('PageMenu.moveThisPage')}
          </a>
          <a href={`/pages/${page._id}/history`} class="dropdown-item">
            {i18n.t('PageMenu.pageHistory')}
          </a>
        </div>
      </div>
    </div>
  );
};
