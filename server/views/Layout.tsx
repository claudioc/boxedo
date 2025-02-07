import { getBundleFilename } from '~/lib/assets';
import { Feedback } from './components/Feedback';
import { Search } from './components/Search';
import { Head } from './components/Head';
import { getFeedbackByCode } from '~/lib/feedbacks';
import styles from './Layout.module.css';
import type { PageModel, Context, WithCtx } from '~/../types';
import { CogIcon } from './icons/CogIcon';
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
        <main class="columns mt-0 ml-0" data-context={context}>
          {/* "main > div" is referenced in App.ts */}
          <div class={[styles.mainLeft, 'column', 'is-narrow']}>
            <header class={[styles.header, 'block']}>
              <div class="block">
                <div class="level is-flex-direction-row">
                  <div class={[styles.title, 'is-size-5', 'level-left']}>
                    <a href="/" class="has-text-warning">
                      {settings.siteTitle}
                    </a>
                  </div>
                  <div class="level-right is-flex-direction-row">
                    <menu class="level">
                      <form method="post" action="/auth/logout">
                        <button
                          type="submit"
                          aria-label={i18n.t('Login.logout')}
                          class="has-text-grey-lighter"
                          title={i18n.t('Login.logout')}
                        >
                          <LogoutIcon title={i18n.t('Login.logout')} />
                        </button>
                      </form>

                      <a
                        href="/settings"
                        aria-label={i18n.t('Navigation.editSettings')}
                        class="has-text-grey-lighter"
                        title={i18n.t('Navigation.editSettings')}
                      >
                        <CogIcon />
                      </a>
                    </menu>
                  </div>
                </div>
              </div>
              <div class="block">
                <Search ctx={ctx} />
              </div>
            </header>

            {withCreateButton && (
              <div class="block">
                {/* The href and text is dynamically updated by our htmx extension */}
                <a
                  class="button is-outlined is-info"
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
              class={[styles.aside, 'block']}
              hx-get={`/parts/nav/${page ? page._id : ''}`}
              hx-trigger="load once"
            >
              <div class="skeleton-lines">
                <div />
                <div />
                <div />
                <div />
                <div />
              </div>
            </aside>
          </div>

          <div class={[styles.mainRight, 'column', 'p-3', 'pr-5']}>
            <button
              type="button"
              x-on:click="window.App.toggleNavbar()"
              class={[
                'navbar-burger',
                'level',
                'level-right',
                'is-hidden-tablet',
              ]}
              aria-label="menu"
              aria-expanded="false"
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
            <div
              x-show="$store.has.some()"
              x-init="setTimeout(() => $store.has.none(), 2000)"
            >
              <Feedback ctx={ctx} feedback={getFeedbackByCode(feedbackCode)} />
            </div>
            {/* #main-page-body is used as a hx-target */}
            <div id="main-page-body">{children}</div>
          </div>
        </main>
      </body>
    </html>
  );
};
