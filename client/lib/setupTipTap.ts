// https://tiptap.dev/docs/editor/extensions/functionality/starterkit
import StarterKit from '@tiptap/starter-kit';
import Document from '@tiptap/extension-document';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import { generateHTML } from '@tiptap/html';
import { Editor, type EditorOptions } from '@tiptap/core';

// The one and only Editor instance
let editor: Editor;

const extensions = [
  Link.configure({
    openOnClick: false,

    HTMLAttributes: {
      defaultProtocol: 'https',
      // Remove target entirely so links open in current tab
      target: null,
    },
  }),
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
        return 'New page';
      }

      return '';
    },
  }),
];

const editorOptions: Partial<EditorOptions> = {
  injectCSS: true,
  editable: true,
  extensions,
  editorProps: {
    handleKeyDown: (_view, event) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if (!(event.metaKey || event.ctrlKey) || event.key !== 'k') {
        return false;
      }

      event.preventDefault();

      // If there's no selection, return
      if (editor.state.selection.empty) return;

      // Get URL from user
      const url = window.prompt('Enter URL:');

      if (url === null) {
        // User cancelled the prompt
        return true;
      }

      if (url === '') {
        // Empty URL, remove the link
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      } else {
        // Set or update the link
        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: url })
          .run();
      }

      return true;
    },
  },
};

export const enableEditor = () => {
  const placeHolder = document.getElementById('editor-placeholder');
  const pageContent = document.querySelector(
    '[name="pageContent"]'
  ) as HTMLInputElement;
  const pageTitle = document.querySelector(
    '[name="pageTitle"]'
  ) as HTMLInputElement;
  const placeHolderContent = (placeHolder?.textContent ?? '').trim();
  if (placeHolder) {
    placeHolder.textContent = '';
  }

  editor = new Editor({
    ...editorOptions,
    element: placeHolder ?? document.createElement('div'),
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

  editor.commands.focus();

  return editor;
};

export type TipTapEditor = ReturnType<typeof enableEditor>;
