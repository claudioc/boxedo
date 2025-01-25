import Image from '@tiptap/extension-image';

export const ImageAlign = Image.extend({
  // If we add more attributes, we also need to update the htmlsanitizer!
  addAttributes() {
    return {
      ...this.parent?.(),

      alignment: {
        default: 'left',
        parseHTML: (element) => element.getAttribute('data-alignment'),
        renderHTML: (attributes) => {
          return {
            'data-alignment': attributes.alignment,
            class: `tiptap-img tiptap-${attributes.alignment}`.trim(),
          };
        },
      },

      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
          };
        },
      },
    };
  },
});
