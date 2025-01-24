// https://tiptap.dev/docs/editor/extensions/functionality/starterkit
import StarterKit from '@tiptap/starter-kit';
import Document from '@tiptap/extension-document';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { generateHTML } from '@tiptap/html';
import { Editor, type Extensions, type EditorOptions } from '@tiptap/core';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import FloatingMenu from '@tiptap/extension-floating-menu';
import { ImageMacro } from './extensions/image-macro';
import { ImageAlign } from './extensions/image-align';

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
    FloatingMenu.configure({
      tippyOptions: {
        // offset: [0, -100],
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
      },
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

  const handleFileUpload = async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
      alert('Only images can be uploaded');
      throw new Error('Please upload an image file');
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('The file size exceed the 5MB limit');
      throw new Error('File size exceeds 5MB limit');
    }

    const objectUrl = URL.createObjectURL(file);

    try {
      const serverUrl = await uploadToServer(file);
      editor
        .chain()
        .focus()
        .updateAttributes('image', { src: serverUrl })
        .run();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Background upload failed:', err);
      alert('Failed saving image to server');
    }

    return objectUrl;
  };

  uploadDialog.showModal();

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
        case 'h3':
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
        case 'image':
          addImageWithDialog();
          break;
        case 'alignLeft':
          {
            const chain = editor.chain().focus();
            if (editor.isActive('image')) {
              chain.updateAttributes('image', { alignment: 'left' }).run();
            } else {
              chain.setTextAlign('left').run();
            }
          }
          break;
        case 'alignCenter':
          {
            const chain = editor.chain().focus();
            if (editor.isActive('image')) {
              chain.updateAttributes('image', { alignment: 'center' }).run();
            } else {
              chain.setTextAlign('center').run();
            }
          }
          break;
        case 'alignRight':
          {
            const chain = editor.chain().focus();
            if (editor.isActive('image')) {
              chain.updateAttributes('image', { alignment: 'right' }).run();
            } else {
              chain.setTextAlign('right').run();
            }
          }
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
