import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Document from '@tiptap/extension-document';
import Placeholder from '@tiptap/extension-placeholder';
import { generateHTML } from '@tiptap/html';

import Alpine, { Alpine as AlpineType } from 'alpinejs';

interface App {
  editor: Editor | null;
  enableEditor: () => void;
}

declare global {
  interface Window {
    Alpine: AlpineType;
    App: App;
  }
}

window.Alpine = Alpine;

const extensions = [
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

const App: App = {
  editor: null,
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
