// https://tiptap.dev/docs/editor/extensions/functionality/starterkit
import { Editor, type EditorOptions, type Extensions } from '@tiptap/core';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import Document from '@tiptap/extension-document';
import FloatingMenu from '@tiptap/extension-floating-menu';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import { ImageAlign } from './extensions/image-align';
import { ImageMacro } from './extensions/image-macro';
import {
  renderTableCommandsSuggestion,
  type TableCommand,
  TableCommands,
  tableCommands,
} from './extensions/table-commands';

// The one and only Editor instance
let editor: Editor;

// This function is called at the moment the editor is instantiated
const getEditorOptions = (): Partial<EditorOptions> => {
  const extensions: Extensions = [
    TableCommands.configure({
      suggestion: {
        startOfLine: true,
        items: ({ query }: { query: string }) => {
          if (query === '') {
            return tableCommands;
          }
          // Filter commands based on the query
          return tableCommands.filter((item: TableCommand) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: renderTableCommandsSuggestion,
        // Only show the commands when inside a table
        allow: ({ editor }) => {
          return (
            editor.isActive('table') ||
            editor.isActive('tableRow') ||
            editor.isActive('tableCell') ||
            editor.isActive('tableHeader')
          );
        },
      },
    }),
    BubbleMenu.configure({
      tippyOptions: {
        appendTo: 'parent',
      },
      element: document.querySelector('.bubbleMenu') as HTMLElement,
    }),
    FloatingMenu.configure({
      tippyOptions: {
        placement: 'left',
      },
      shouldShow: ({ editor }) => {
        const { $from } = editor.state.selection;
        const currentNode = $from.parent;

        // Check four conditions:
        // 1. We're in a paragraph
        // 2. The paragraph is empty
        // 3. We're at the start of the node
        // 4. We're not in a list
        return (
          currentNode.type.name === 'paragraph' &&
          currentNode.content.size === 0 &&
          $from.parentOffset === 0 &&
          $from.depth === 1
        );
      },
      element: document.querySelector('.floatingMenu') as HTMLElement,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        defaultProtocol: 'https',
        // Remove target entirely so links open in current tab
        target: null,
        rel: 'noopener noreferrer',
      },
      validate: (href) => /^https?:\/\//.test(href),
    }),
    Typography,
    Highlight,
    Underline,
    TextAlign.configure({
      types: ['paragraph'],
    }),
    ImageAlign,
    ImageMacro,
    Document.extend({
      content: 'heading block*',
    }),
    StarterKit.configure({
      document: false,
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') {
          if (node.attrs.level === 1) {
            return 'New page';
          }
          return `New heading level ${node.attrs.level}`;
        }

        if (node.type.name === 'paragraph') {
          return 'New paragraph';
        }

        return '';
      },
    }),
    Table.configure({
      resizable: false,
      cellMinWidth: 50,
      HTMLAttributes: {
        class: 'table is-bordered is-hoverable is-fullwidth',
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
  ];

  return {
    injectCSS: true,
    editable: true,
    extensions,
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (!(event.metaKey || event.ctrlKey)) {
          return;
        }

        if (event.key === 'k') {
          event.preventDefault();
          if (!editor.state.selection.empty) {
            addLink();
          }
          return true;
        }

        // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) for saving
        if (event.key === 'Enter') {
          event.preventDefault();

          // Find the form and submit it
          const form = document.querySelector(
            'form[method="post"] button[type="submit"]'
          );
          if (form) {
            (form as HTMLButtonElement).click();
          }

          return true;
        }
      },
    },
  };
};

const addLink = () => {
  // Get URL from user
  const previousUrl = editor.getAttributes('link').href;
  const url = window.prompt('Enter URL:', previousUrl);

  if (url === null) {
    // User cancelled the prompt
    return true;
  }

  if (url === '') {
    // Empty URL, remove the link
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }

  let validUrl: string;
  try {
    // Add https if protocol is missing
    validUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    new URL(validUrl); // This will throw if URL is invalid
  } catch {
    window.alert('Please enter a valid URL');
    return;
  }

  editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({
      href: validUrl,
    })
    .run();
};

let uploadDialog: HTMLDialogElement;

interface UploadFormFields {
  uploadUrl: string;
  uploadFile: File;
}

const addImageWithDialog = () => {
  if (!uploadDialog) {
    uploadDialog = document.getElementById('uploadDialog') as HTMLDialogElement;
    if (!uploadDialog) {
      return;
    }

    const form = uploadDialog.querySelector('form') as HTMLFormElement;
    form?.addEventListener('submit', (evt) => submitUpload(evt, form));
  }

  const uploadToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/uploads', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Server upload failed');
    }

    const { url } = await response.json();
    return url;
  };

  uploadDialog.showModal();

  const handleFileUpload = async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
      alert('Only images can be uploaded');
      window.App.resetForm();
      throw new Error('Please upload an image file');
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('The file size exceed the 5MB limit');
      window.App.resetForm();
      throw new Error('File size exceeds 5MB limit');
    }

    let serverUrl = '';
    try {
      serverUrl = await uploadToServer(file);
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed saving image to server');
      window.App.resetForm();
    }

    window.App.resetForm();

    return serverUrl;
  };

  async function submitUpload(evt: Event, form: HTMLFormElement) {
    evt.preventDefault();
    const data = new FormData(form);

    const formFields = Object.fromEntries(
      data.entries()
    ) as unknown as UploadFormFields;

    const imageSrc =
      formFields.uploadUrl?.trim() ||
      (formFields.uploadFile
        ? await handleFileUpload(formFields.uploadFile)
        : '');

    if (imageSrc) {
      editor.chain().focus().setImage({ src: imageSrc }).run();
      uploadDialog.close();
      form.reset();
    }
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
  | 'h3'
  | 'p'
  | 'link'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'image'
  | 'sizeAuto'
  | 'sizeSmall'
  | 'sizeMedium'
  | 'hr'
  | 'table'
  | '';

const addBubbleMenuHandlers = () => {
  const buttons = document.querySelectorAll(
    '.floatingMenu button, .bubbleMenu button'
  );

  buttons.forEach((button) => {
    button.addEventListener('click', (evt) => {
      evt.preventDefault();
      const command: BubbleMenuCommands = ((button as HTMLElement).dataset
        .command ?? '') as BubbleMenuCommands;
      const chain = editor.chain().focus();
      switch (command) {
        case 'table':
          chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          break;
        case 'hr':
          chain.setHorizontalRule().run();
          break;
        case 'bold':
          chain.toggleBold().run();
          break;
        case 'italic':
          chain.toggleItalic().run();
          break;
        case 'strike':
          chain.toggleStrike().run();
          break;
        case 'underline':
          chain.toggleUnderline().run();
          break;
        case 'highlight':
          chain.toggleHighlight().run();
          break;
        case 'code':
          chain.toggleCode().run();
          break;
        case 'codeblock':
          chain.toggleCodeBlock().run();
          break;
        case 'h1':
        case 'h2':
        case 'h3':
          chain
            .toggleHeading({
              // @ts-ignore
              level: Number.parseInt(command.charAt(1), 10),
            })
            .run();
          break;
        case 'p':
          chain.setParagraph().run();
          break;
        case 'link':
          addLink();
          break;
        case 'image':
          addImageWithDialog();
          break;
        case 'alignLeft':
          {
            if (editor.isActive('image')) {
              chain
                .updateAttributes('image', { width: '50%', alignment: 'left' })
                .run();
            } else {
              chain.setTextAlign('left').run();
            }
          }
          break;
        case 'alignCenter':
          {
            if (editor.isActive('image')) {
              chain.updateAttributes('image', { alignment: 'center' }).run();
            } else {
              chain.setTextAlign('center').run();
            }
          }
          break;
        case 'alignRight':
          {
            if (editor.isActive('image')) {
              chain.updateAttributes('image', { alignment: 'right' }).run();
            } else {
              chain.setTextAlign('right').run();
            }
          }
          break;
        case 'sizeAuto':
          chain.updateAttributes('image', { width: '100%' }).run();
          break;
        case 'sizeSmall':
          chain.updateAttributes('image', { width: '25%' }).run();
          break;
        case 'sizeMedium':
          chain.updateAttributes('image', { width: '50%' }).run();
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
