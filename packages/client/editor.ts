import { enableEditor } from './lib/setupTipTap';

if (window.App) {
  window.App.enableEditor = () => {
    window.App.setEditor(enableEditor());
  };
}
