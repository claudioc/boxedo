import { enableEditor } from './lib/setupTipTap';
import { type AppInstance } from './app';

if (window.App) {
  (window.App as AppInstance).enableEditor = () => {
    enableEditor();
  };
}
