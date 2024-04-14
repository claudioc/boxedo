import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Document from '@tiptap/extension-document';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { generateHTML } from '@tiptap/html';

import Alpine, { Alpine as AlpineType } from 'alpinejs';

declare global {
  interface Window {
    Alpine: AlpineType;
    App: App;
  }
}

window.Alpine = Alpine;

const extensions = [
  Typography,
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

      if (Object.values(error).some((v) => v)) {
        form._x_model.set(error);
        event.preventDefault();
        return;
      }
    }

    if (form.name === 'movePage') {
      if (
        data.get('newParentId') === '' ||
        data.get('newParentId') === data.get('oldParentId')
      ) {
        error.newParentId = true;
        form._x_model.set(error);
        event.preventDefault();
        return;
      }
    }

    window.onbeforeunload = null;
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

window.App = App;

Alpine.start();
