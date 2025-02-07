import type { WithCtx } from '~/../types';
import { Head } from './components/Head';
import styles from './Layout.module.css';

interface LayoutMiniProps extends WithCtx {
  title: string;
  children: string | JSX.Element[] | JSX.Element;
}

export const LayoutMini = ({ ctx, title, children }: LayoutMiniProps) => {
  const { settings } = ctx.app;

  return (
    <html lang="en">
      <Head
        title={title}
        withEditor={false}
        withVendorScripts={false}
        ctx={ctx}
      />
      <body>
        <main class="hero is-fullheight">
          <header class={[styles.header]}>
            <div class={[styles.title, 'is-size-5']}>
              <a href="/" class="has-text-warning">
                {settings.siteTitle}
              </a>
            </div>
          </header>

          <div class="hero-body">
            <div class="container">
              <div class="columns is-centered">
                <div class="column is-5-tablet is-5-desktop is-5-widescreen">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
};
