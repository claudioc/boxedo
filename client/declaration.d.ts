import type { Alpine as AlpineType } from 'alpinejs';
import type { AppInstance } from './app';

declare global {
  const JNGL_LIVERELOAD_URL: string;
  const JNGL_BASE_PATH: string;
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
