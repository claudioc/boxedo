import { ValidationErrors } from '~/views/components/ValidationErrors';
import type { WithApp } from '../../../types';

interface PageFormWrapperProps extends WithApp {
  children: string | JSX.Element[] | JSX.Element;
}

export const PageFormWrapper = ({ app, children }: PageFormWrapperProps) => (
  <div x-init="window.onbeforeunload=function() { return true };">
    <ValidationErrors app={app} />
    {children}
  </div>
);
