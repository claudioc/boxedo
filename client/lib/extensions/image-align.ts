import Image from '@tiptap/extension-image';

export const ImageAlign = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alignment: {
        default: 'left',
        parseHTML: (element) => element.getAttribute('data-alignment'),
        renderHTML: (attributes) => {
          return {
            'data-alignment': attributes.alignment,
            class: `tiptap-img tiptap-${attributes.alignment}`,
          };
        },
      },
    };
  },
});
