import { store } from './lib/setupAlpine';
import './lib/setupHtmx';
import type { TipTapEditor } from './lib/setupTipTap';
import { removeQueryParam } from './lib/helpers';

class App {
  private editor: TipTapEditor | null = null;

  constructor() {
    document.addEventListener('DOMContentLoaded', () => {
      const cleanUrl: string = removeQueryParam(window.location.href, 'f');
      history.replaceState(null, '', cleanUrl);
    });
  }

  validate(event: Event) {
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const error: Record<string, boolean> = {};
    // Do not validate these fields because they are not user input
    const preValidated = ['_csrf', 'rev'];

    if (form.name === 'editPage' || form.name === 'createPage') {
      for (const [key, value] of data.entries()) {
        // Just a simple check for empty values; the same thing is done on the server
        // Beware that the entries also include the CSRF token and the rev
        if (preValidated.includes(key)) {
          continue;
        }
        error[key] = (value as string).trim() === '';
      }
    }

    if (form.name === 'movePage') {
      if (
        data.get('newParentId') === '' ||
        data.get('newParentId') === data.get('oldParentId')
      ) {
        error.newParentId = true;
      }
    }

    store.error = error;

    if (Object.values(error).some((v) => v)) {
      event.preventDefault();
      return;
    }

    window.onbeforeunload = null;
  }

  addImage(event: Event) {
    event.preventDefault();
    if (!this.editor) {
      return;
    }

    const imgUrl = 'https://source.unsplash.com/random/320x200';

    this.editor
      .chain()
      .focus()
      .setImage({
        src: imgUrl,
        alt: 'Random image from unsplash',
      })
      .run();
    // Not sure what's the difference.
    // editor.commands.insertContent(image);
  }

  enableEditor() {
    // This method is rewritten in the editor.ts file
    console.error('enableEditor is not implemented');
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
