import type { Alpine as AlpineType } from 'alpinejs';
import type { AppInstance } from './app';

declare global {
  const LIVERELOAD_URL: string;
  interface Window {
    Alpine: AlpineType;
    App: AppInstance;
    htmx: {
      defineExtension: (
        name: string,
        extension: Record<string, unknown>
      ) => void;
    };
  }
}
