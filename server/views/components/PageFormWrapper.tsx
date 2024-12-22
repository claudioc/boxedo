import type { JSX } from 'preact';
import { ValidationErrors } from '~/views/components/ValidationErrors';

interface PageFormWrapperProps {
  children: string | JSX.Element[] | JSX.Element;
}

export const PageFormWrapper = ({ children }: PageFormWrapperProps) => (
  <div x-init="window.onbeforeunload=function() { return true };">
    <ValidationErrors />
    {children}
  </div>
);
