import { store } from './lib/setupAlpine';
import './lib/setupHtmx';
import type { TipTapEditor } from './lib/setupTipTap';
import { removeQueryParam, isUrl } from './lib/helpers';
import { enableSortable, destroySortable } from './lib/setupSortable';
import type { Context } from '../types';

class App {
  private editor: TipTapEditor | null = null;

  constructor() {
    document.addEventListener('DOMContentLoaded', () => {
      const cleanUrl: string = removeQueryParam(window.location.href, 'f');
      history.replaceState(null, '', cleanUrl);

      const burgerToggle = document.querySelector('.navbar-burger');
      if (burgerToggle) {
        burgerToggle.addEventListener('click', () => window.App.toggleNavbar());
      }
    });
  }

  getContext(el: HTMLElement) {
    const provider = el.closest('[data-context]') as HTMLElement | null;
    if (!provider) {
      return null;
    }

    const context: Context | null = provider.dataset?.context
      ? (provider.dataset.context as Context)
      : null;

    return context;
  }

  getEditor() {
    return this.editor;
  }

  setEditor(editor: typeof this.editor) {
    this.editor = editor;
  }

  // Validates all the forms on the client to work in conjunction with Alpine
  // to show error messages
  validate(event: Event) {
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const error: Record<string, boolean> = {};

    const context = window.App.getContext(form);

    if (!context) {
      event.preventDefault();
      console.error('Cannot validate out of a context', context);
      return null;
    }

    // Do not validate these fields because they are not user input
    const preValidated = ['_csrf', 'rev'];

    if (context === 'editing page') {
      for (const [key, value] of data.entries()) {
        // Just a simple check for empty values; the same thing is done on the server
        // Beware that the entries also include the CSRF token and the rev
        if (preValidated.includes(key)) {
          continue;
        }
        error[key] = (value as string).trim() === '';
      }
    }

    if (context === 'moving page') {
      const formFields = Object.fromEntries(data.entries());
      if (
        (formFields.moveToTop === 'false' && formFields.newParentId === '') ||
        formFields.newParentId === formFields.oldParentId
      ) {
        error.newParentId = true;
      }
    }

    if (context === 'uploading file') {
      const formFields = Object.fromEntries(data.entries());
      const url = (formFields.uploadUrl as string).trim();
      const file = formFields.uploadFile as File;

      if (url === '' && file.size === 0) {
        error.uploadUrl = true;
        error.uploadFile = true;
      }

      if (url !== '' && !isUrl(url)) {
        error.uploadUrl = true;
      }
    }

    store.error = error;

    if (Object.values(error).some((v) => v)) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }

    window.onbeforeunload = null;
  }

  enableEditor() {
    // This method is rewritten in the editor.ts file
    console.error('enableEditor is not implemented');
  }

  enableSortable(el?: Element | null) {
    destroySortable();
    enableSortable(el as HTMLElement);
  }

  destroySortable() {
    destroySortable();
  }

  toggleNavbar() {
    const nav = document.querySelector('main > div');
    nav?.classList.toggle('isOpen');
  }

  livereload() {
    if (!LIVERELOAD_URL) {
      return;
    }

    new EventSource(LIVERELOAD_URL).addEventListener('message', () =>
      location.reload()
    );
  }
}

window.App = new App();

export type AppInstance = InstanceType<typeof App>;
