import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Document from '@tiptap/extension-document';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import { generateHTML } from '@tiptap/html';

import Alpine, { Alpine as AlpineType } from 'alpinejs';

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

interface AppStore {
  error: Record<string, boolean>;
  info: boolean;
  errorOn(key: string): boolean;
  some(): boolean;
  none(): void;
}

Alpine.store('has', {
  error: {},
  info: true,
  errorOn(key: string) {
    return !!this.error[key];
  },
  some() {
    return this.info || (this.error && Object.keys(this.error).length > 0);
  },
  none() {
    this.error = {};
    this.info = false;
  },
} as AppStore);

window.Alpine = Alpine;

const extensions = [
  Typography,
  Image,
  Document.extend({
    content: 'heading block*',
  }),
  StarterKit.configure({
    document: false,
  }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading') {
        return "What's the title?";
      }

      return '';
    },
  }),
];

const editorOptions = {
  injectCSS: true,
  editable: true,
  extensions,
};

interface App {
  editor: Editor | null;
  enableEditor: () => void;
  validate: (event: Event) => void;
  addImage: (event: Event) => void;
}

const App: App = {
  editor: null,
  validate: (event) => {
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const error: Record<string, boolean> = {};

    if (form.name === 'editPage' || form.name === 'createPage') {
      for (const [key, value] of data.entries()) {
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

    (Alpine.store('has') as AppStore).error = error;

    if (Object.values(error).some((v) => v)) {
      event.preventDefault();
      return;
    }

    window.onbeforeunload = null;
  },

  addImage: (event: Event) => {
    event.preventDefault();
    const editor = App.editor;
    if (!editor) {
      return;
    }

    const imgUrl = 'https://source.unsplash.com/random/320x200';

    editor
      .chain()
      .focus()
      .setImage({
        src: imgUrl,
        alt: 'Random image from unsplash',
      })
      .run();
    // Not sure what's the difference.
    // editor.commands.insertContent(image);
  },

  enableEditor: () => {
    const placeHolder = document.getElementById('editor-placeholder')!;
    const pageContent = document.querySelector(
      '[name="pageContent"]'
    )! as HTMLTextAreaElement;
    const pageTitle = document.querySelector(
      '[name="pageTitle"]'
    )! as HTMLTextAreaElement;
    const placeHolderContent = (placeHolder.textContent || '').trim();

    if (placeHolder) {
      placeHolder.textContent = '';
    }

    App.editor = new Editor({
      ...editorOptions,
      element: placeHolder,
      content: placeHolderContent,
      onUpdate: ({ editor }) => {
        const json = editor.getJSON();
        if (!json || !Array.isArray(json.content)) {
          return;
        }
        const heading = json.content[0];
        const rest = json.content.slice(1);

        pageTitle.value = Array.isArray(heading.content)
          ? (
              heading.content.reduce((acc, node) => acc + node.text, '') || ''
            ).trim()
          : '';

        pageContent.value =
          rest.length === 0
            ? ''
            : generateHTML({ ...json, content: rest }, extensions);
      },
    });

    App.editor.commands.focus();
  },
};

const htmx = window.htmx;

if (htmx) {
  htmx.defineExtension('activate', {
    onEvent: (name: string, evt: Event) => {
      const el = evt.target as HTMLElement;
      if (!el || name !== 'htmx:xhr:loadend') {
        return;
      }
      const [parent, activeClass] = (el.dataset.activate || '').split('/');
      if (!parent || !activeClass) {
        return;
      }

      el.closest(parent)
        ?.querySelectorAll(`.${activeClass}`)
        .forEach((el) => el.classList.remove(activeClass));

      el.classList.add(activeClass);
    },
  });
}

window.App = App;

Alpine.start();
