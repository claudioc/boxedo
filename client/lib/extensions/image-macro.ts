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
        ({ tr, commands, state }) => {
          const deleteFrom = position - (this.options.trigger.length - 1); // -1 because we don't have the final }
          const deleteTo = position;

          if (deleteFrom < 0) return false;

          // Find the current paragraph node
          const $pos = state.doc.resolve(deleteFrom);
          const paragraph = $pos.parent;

          // If this is an empty paragraph (only contains our trigger without the final })
          if (paragraph.textContent === this.options.trigger.slice(0, -1)) {
            // Delete the entire paragraph
            tr.delete($pos.before(), $pos.after());
          } else {
            // Just delete the trigger text
            tr.delete(deleteFrom, deleteTo);
          }

          // Insert image at the adjusted position
          return commands.insertContent({
            type: 'image',
            attrs: { src: url },
          });
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
