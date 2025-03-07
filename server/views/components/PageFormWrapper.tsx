import type { WithCtx } from '~/../types';
import { ValidationErrors } from '~/views/components/ValidationErrors';

interface PageFormWrapperProps extends WithCtx {
  children: string | JSX.Element[] | JSX.Element;
}

export const PageFormWrapper = ({ ctx, children }: PageFormWrapperProps) => (
  <div
    x-init={`window.onbeforeunload=${ctx.app.is('development') ? 'null' : 'function() { return true };'}`}
  >
    <ValidationErrors ctx={ctx} />
    {children}
  </div>
);
