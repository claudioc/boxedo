import { Alpine as AlpineType } from 'alpinejs';

declare global {
  interface Window {
    Alpine: AlpineType;
    App: App;
    htmx: {
      defineExtension: (
        name: string,
        extension: Record<string, unknown>
      ) => void;
    };
  }
}
