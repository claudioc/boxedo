// https://tiptap.dev/docs/editor/extensions/functionality/starterkit
import StarterKit from '@tiptap/starter-kit';
import Document from '@tiptap/extension-document';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { generateHTML } from '@tiptap/html';
import { Editor, type Extensions, type EditorOptions } from '@tiptap/core';
import BubbleMenu from '@tiptap/extension-bubble-menu';

// The one and only Editor instance
let editor: Editor;

// This function is called at the moment the editor is instantiated
const getEditorOptions = (): Partial<EditorOptions> => {
  const extensions: Extensions = [
    BubbleMenu.configure({
      tippyOptions: {
        appendTo: 'parent',
      },
      element: document.querySelector('.bubbleMenu') as HTMLElement,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        defaultProtocol: 'https',
        // Remove target entirely so links open in current tab
        target: null,
      },
    }),
    Typography,
    Highlight,
    Underline,
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

        if (node.type.name === 'paragraph') {
          return 'New paragraph';
        }

        return '';
      },
    }),
  ];

  return {
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
        if (editor.state.selection.empty) {
          return;
        }

        addLink();

        return true;
      },
    },
  };
};

const addLink = () => {
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
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }
};

type BubbleMenuCommands =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'underline'
  | 'highlight'
  | 'code'
  | 'codeblock'
  | 'h1'
  | 'h2'
  | 'p'
  | 'link'
  | '';

const addBubbleMenuHandlers = () => {
  const buttons = document.querySelectorAll('.bmButton');

  buttons.forEach((button) => {
    button.addEventListener('click', (evt) => {
      evt.preventDefault();
      const command: BubbleMenuCommands = ((button as HTMLElement).dataset
        .command ?? '') as BubbleMenuCommands;
      switch (command) {
        case 'bold':
          editor.chain().focus().toggleBold().run();
          break;
        case 'italic':
          editor.chain().focus().toggleItalic().run();
          break;
        case 'strike':
          editor.chain().focus().toggleStrike().run();
          break;
        case 'underline':
          editor.chain().focus().toggleUnderline().run();
          break;
        case 'highlight':
          editor.chain().focus().toggleHighlight().run();
          break;
        case 'code':
          editor.chain().focus().toggleCode().run();
          break;
        case 'codeblock':
          editor.chain().focus().toggleCodeBlock().run();
          break;
        case 'h1':
        case 'h2':
          editor
            .chain()
            .focus()
            .toggleHeading({
              // @ts-ignore
              level: Number.parseInt(command.charAt(1), 10),
            })
            .run();
          break;
        case 'p':
          editor.chain().focus().setParagraph().run();
          break;
        case 'link':
          addLink();
          break;
        default:
          console.warn(`Unknown command: ${command}`);
      }
    });
  });
};

export const enableEditor = () => {
  const placeHolder = document.getElementById('editor-placeholder');
  /* Debug info */
  const pageContent = document.querySelector(
    '[name="pageContent"]'
  ) as HTMLInputElement;
  const pageTitle = document.querySelector(
    '[name="pageTitle"]'
  ) as HTMLInputElement;
  /* End Debug info */
  const placeHolderContent = (placeHolder?.getHTML() ?? '').trim();
  if (placeHolder) {
    placeHolder.textContent = '';
  }

  const options = getEditorOptions();

  // Tippy destroy the DOM element, hence we need to set the handlers before creating the editor
  addBubbleMenuHandlers();

  editor = new Editor({
    ...options,
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
          : generateHTML({ ...json, content: rest }, options.extensions ?? []);
    },
  });

  editor.commands.focus();

  return editor;
};

export type TipTapEditor = ReturnType<typeof enableEditor>;
