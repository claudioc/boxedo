import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

export interface ImageMacroOptions {
  trigger: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageMacro: {
      /**
       * Insert image at current position
       */
      insertImageAtPos: (url: string, position: number) => ReturnType;
    };
  }
}

export const ImageMacro = Extension.create<ImageMacroOptions>({
  name: 'imageMacro',

  addOptions() {
    return {
      trigger: '{img}',
    };
  },

  addCommands() {
    return {
      insertImageAtPos:
        (url: string, position: number) =>
        ({ tr, commands }) => {
          // Delete the trigger text
          const deleteFrom = position - this.options.trigger.length;
          const deleteTo = position;

          if (deleteFrom < 0) return false;

          tr.delete(deleteFrom, deleteTo);

          // Insert image at the adjusted position
          return commands.insertContent([
            {
              type: 'image',
              attrs: { src: url },
            },
          ]);
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    const pluginKey = new PluginKey('imageMacro');

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleTextInput(view, from, to, text) {
            const { state } = view;
            const $from = state.doc.resolve(from);

            // Build the string that includes the new text
            const currentLine = $from.parent.textContent + text;

            // Check if the line ends with the trigger
            if (currentLine.endsWith(extension.options.trigger)) {
              // Prompt for image URL
              const url = window.prompt('Enter image source URL:');

              if (url) {
                // Insert the image
                view.dispatch(state.tr.delete(from, to));
                extension.editor?.commands.insertImageAtPos(
                  url,
                  from + text.length
                );
              } else {
                // If no URL provided, just insert the text normally
                return false;
              }

              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

// Usage example:
/*
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { ImageMacro } from './image-macro'

const editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [
    StarterKit,
    Image,
    ImageMacro.configure({
      trigger: '{img}' // Optional: customize the trigger
    })
  ],
})
*/
