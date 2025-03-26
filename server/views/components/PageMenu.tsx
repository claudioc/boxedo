import type { PageModel, WithCtx } from '~/../types';
import { AuthorizationService } from '~/services/AuthorizationService';
import { EllipsisIcon } from '../icons/EllipsisIcon';

interface PageMenuProps extends WithCtx {
  page?: PageModel;
}

export const PageMenu = ({ ctx, page }: PageMenuProps) => {
  const { i18n } = ctx.app;

  if (!page) {
    return null;
  }

  const authService = AuthorizationService.getInstance();

  return (
    <div class="dropdown dropdown-hover dropdown-end">
      <div
        tabindex="0"
        class="btn-ghost sm:btn sm:btn-solid"
        aria-haspopup="true"
      >
        <span class="hidden md:block">{i18n.t('PageMenu.actions')} …</span>
        <span class="block md:hidden">
          <EllipsisIcon title={i18n.t('PageMenu.actions')} />
        </span>
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu bg-base-300 rounded-field z-1 w-52 p-2"
      >
        {authService.hasCapability(ctx.user, 'pages:edit') && (
          <li>
            <a href={`/pages/${page._id}/edit`} class="dropdown-item">
              {i18n.t('PageMenu.editThisPage')}
            </a>
          </li>
        )}
        {authService.hasCapability(ctx.user, 'pages:move') && (
          <li>
            <a href={`/pages/${page._id}/move`} class="dropdown-item">
              {i18n.t('PageMenu.moveThisPage')}
            </a>
          </li>
        )}
        {authService.hasCapability(ctx.user, 'pages:view_history') && (
          <li class="disabled">
            <a href={`/pages/${page._id}/history`} class="dropdown-item">
              {i18n.t('PageMenu.pageHistory')}
            </a>
          </li>
        )}
        <li class="disabled">
          <span class="divider" />
        </li>
        {authService.hasCapability(ctx.user, 'settings:edit') && (
          <li>
            <a href="/settings">{i18n.t('Navigation.editSettings')}</a>
          </li>
        )}
        {authService.hasCapability(ctx.user, 'pref:edit') && (
          <li>
            <a href="/preferences">{i18n.t('Navigation.editPreferences')}</a>
          </li>
        )}
      </ul>
    </div>
  );
};
