import type { WithCtx } from '~/../types';
import { getBundleFilename } from '~/lib/assets';
import { Head } from './components/Head';

interface LayoutMiniProps extends WithCtx {
  title: string;
  children: string | JSX.Element[] | JSX.Element;
}

export const LayoutMini = ({ ctx, title, children }: LayoutMiniProps) => {
  const { settings, urlService } = ctx.app;

  return (
    <html lang="en">
      <Head
        title={title}
        withEditor={false}
        withVendorScripts={false}
        ctx={ctx}
      />
      <body>
        <script src={getBundleFilename('appMini')} />
        <main class="min-h-screen flex flex-col">
          <header class="p-4 prose">
            <h1>
              <a
                href={urlService.url('/')}
                title="/"
                class="uppercase no-underline"
              >
                {settings.siteTitle}
              </a>
            </h1>
          </header>

          <div class="flex-1 flex items-center justify-center">
            <div class="container mx-auto px-4">
              <div class="flex justify-center">
                <div class="w-full md:w-5/12 lg:w-5/12 xl:w-5/12">
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
