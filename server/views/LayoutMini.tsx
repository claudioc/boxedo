import type { WithApp } from '~/../types';
import { Head } from './components/Head';

interface LayoutMiniProps extends WithApp {
  title: string;
  children: string | JSX.Element[] | JSX.Element;
}

export const LayoutMini = ({ app, title, children }: LayoutMiniProps) => {
  return (
    <html lang="en">
      <Head
        title={title}
        withEditor={false}
        withVendorScripts={false}
        app={app}
      />
      <body>
        <main class="hero is-fullheight">
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
