import { JSX } from 'preact';
import { ValidationErrors } from '../components/ValidationErrors';

interface PageFormWrapperProps {
  title: string;
  children: string | JSX.Element[] | JSX.Element;
}

export const PageFormWrapper = ({ title, children }: PageFormWrapperProps) => (
  <div
    x-data="{error: { pageTitle: false, pageContent: false }}"
    x-init="window.onbeforeunload=function() { return true };"
  >
    <h1 class="subtitle">{title}</h1>
    <ValidationErrors />
    {children}
  </div>
);
