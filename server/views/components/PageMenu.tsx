import type { PageModel, WithCtx } from '~/../types';

interface PageMenuProps extends WithCtx {
  page?: PageModel;
}

export const PageMenu = ({ ctx, page }: PageMenuProps) => {
  const { i18n } = ctx.app;

  if (!page) {
    return null;
  }

  return (
    <div class="dropdown dropdown-hover dropdown-end">
      {/* biome-ignore lint/a11y/useFocusableInteractive: */}
      {/* biome-ignore lint/a11y/useSemanticElements: */}
      <div tabindex="0" role="button" class="btn m-0" aria-haspopup="true">
        <span>{i18n.t('PageMenu.actions')} …</span>
      </div>
      {/* <span>
        <EllipsisIcon title={i18n.t('PageMenu.actions')} />
      </span> */}
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
      >
        <li>
          <a href={`/pages/${page._id}/edit`} class="dropdown-item">
            {i18n.t('PageMenu.editThisPage')}
          </a>
        </li>
        <li>
          <a href={`/pages/${page._id}/move`} class="dropdown-item">
            {i18n.t('PageMenu.moveThisPage')}
          </a>
        </li>
        <li>
          <a href={`/pages/${page._id}/history`} class="dropdown-item">
            {i18n.t('PageMenu.pageHistory')}
          </a>
        </li>
      </ul>
    </div>
  );
};
