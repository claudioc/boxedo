import type { Context, PageModel, WithCtx } from '~/../types';
import { getBundleFilename } from '~/lib/assets';
import { getFeedbackByCode } from '~/lib/feedbacks';
import { Feedback } from './components/Feedback';
import { Head } from './components/Head';
import { Search } from './components/Search';
import { CogIcon } from './icons/CogIcon';
import { HamburgerIcon } from './icons/HamburgerIcon';
import { LogoutIcon } from './icons/LogoutIcon';

interface LayoutProps extends WithCtx {
  title: string;
  page?: PageModel | null;
  children: string | JSX.Element[] | JSX.Element;
  context?: Context;
  isLandingPage?: boolean;
  withEditor?: boolean;
  withCreateButton?: boolean;
}

export const Layout = ({
  ctx,
  title,
  page,
  children,
  context = 'none',
  isLandingPage = false,
  withEditor = false,
  withCreateButton = true,
}: LayoutProps) => {
  const { feedbackCode, i18n, settings } = ctx.app;
  const user = ctx.user;

  const onKeypress = {
    '@keyup.escape': '$store.has.none()',
  };

  const createButtonLink =
    isLandingPage || !page
      ? '/pages/create'
      : `/pages/create?parentPageId=${page._id}`;

  return (
    <html lang="en">
      <Head title={title} withEditor={withEditor} withVendorScripts ctx={ctx} />
      <body x-data="" {...onKeypress}>
        <script src={getBundleFilename('app')} />
        {withEditor && <script src={getBundleFilename('editor')} />}
        {process.env.NODE_ENV === 'development' && (
          <script>App.livereload();</script>
        )}

        {/* We use the context to identify what we are doing, like 'editing page' for example; useful for CSS or JS targeting */}
        <main data-context={context} class="drawer lg:drawer-open">
          <input id="layout-drawer" type="checkbox" class="drawer-toggle" />
          <div class="drawer-content flex flex-col p-4">
            <div class="flex justify-end">
              <label
                for="layout-drawer"
                aria-label="open sidebar"
                class="btn btn-square btn-ghost lg:hidden"
              >
                <HamburgerIcon title="Open sidebar" />
              </label>
            </div>
            <div
              x-show="$store.has.some()"
              x-init="setTimeout(() => $store.has.none(), 3000)"
            >
              <Feedback ctx={ctx} feedback={getFeedbackByCode(feedbackCode)} />
            </div>
            {/* #main-page-body is used as a hx-target */}
            <div id="main-page-body">{children}</div>
          </div>

          <div class="drawer-side min-h-screen bg-neutral max-w-72">
            <div>
              <div class="navbar">
                <div class="uppercase flex-1">
                  <a href="/">{settings.siteTitle}</a>
                </div>
                <div class="flex-none">
                  <ul class="menu menu-xs menu-horizontal">
                    {user ? (
                      <li>
                        <form method="post" action="/auth/logout">
                          <button
                            type="submit"
                            aria-label={i18n.t('Login.logout')}
                            title={i18n.t('Login.logout')}
                          >
                            <LogoutIcon title={i18n.t('Login.logout')} />
                          </button>
                        </form>
                      </li>
                    ) : null}
                    <li>
                      <a
                        href="/settings"
                        aria-label={i18n.t('Navigation.editSettings')}
                        title={i18n.t('Navigation.editSettings')}
                      >
                        <CogIcon />
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div class="p-4">
                <label
                  for="layout-drawer"
                  aria-label="close sidebar"
                  class="drawer-overlay"
                />

                <div class="mb-5">
                  <Search ctx={ctx} />
                </div>

                {withCreateButton && (
                  <div class="mb-5">
                    {/* The href and text is dynamically updated by our htmx extension */}
                    <a
                      class="j-btn"
                      href={createButtonLink}
                      data-labelNested={i18n.t('Navigation.createNestedPage')}
                    >
                      {isLandingPage
                        ? i18n.t('Navigation.createTopPage')
                        : i18n.t('Navigation.createNestedPage')}
                    </a>
                  </div>
                )}

                <aside
                  class={['mb-5', 'text-base-content']}
                  hx-get={`/parts/nav/${page ? page._id : ''}?disabled=${context === 'editing page'}`}
                  hx-trigger="load once"
                >
                  <div class="flex w-52 flex-col gap-4">
                    <div class="skeleton h-2 w-28" />
                    <div class="skeleton h-2 w-full" />
                    <div class="skeleton h-2 w-28" />
                    <div class="skeleton h-2 w-full" />
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
};
