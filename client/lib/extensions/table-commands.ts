import { Extension, type Editor } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';

export interface TableCommandsOptions {
  suggestion: Partial<SuggestionOptions>;
}

export interface TableCommand {
  title: string;
  command: (props: { editor: Editor }) => void;
}

// List of table commands that will be shown in the slash menu
export const tableCommands: TableCommand[] = [
  {
    title: 'Add row above',
    command: ({ editor }) => {
      // You'll implement this
      editor.chain().focus().addRowBefore().run();
    },
  },
  {
    title: 'Add row below',
    command: ({ editor }) => {
      // You'll implement this
      editor.chain().focus().addRowAfter().run();
    },
  },
  {
    title: 'Add column left',
    command: ({ editor }) => {
      // You'll implement this
      editor.chain().focus().addColumnBefore().run();
    },
  },
  {
    title: 'Add column right',
    command: ({ editor }) => {
      // You'll implement this
      editor.chain().focus().addColumnAfter().run();
    },
  },
  {
    title: 'Delete row',
    command: ({ editor }) => {
      // You'll implement this
      editor.chain().focus().deleteRow().run();
    },
  },
  {
    title: 'Delete column',
    command: ({ editor }) => {
      // You'll implement this
      editor.chain().focus().deleteColumn().run();
    },
  },
  {
    title: 'Delete table',
    command: ({ editor }) => {
      // You'll implement this
      editor.chain().focus().deleteTable().run();
    },
  },
  {
    title: 'Merge cells',
    command: ({ editor }) => {
      // You'll implement this
      editor.chain().focus().mergeCells().run();
    },
  },
  {
    title: 'Split cell',
    command: ({ editor }) => {
      // You'll implement this
      editor.chain().focus().splitCell().run();
    },
  },
  {
    title: 'Toggle header row',
    command: ({ editor }) => {
      // You'll implement this
      editor.chain().focus().toggleHeaderRow().run();
    },
  },
  {
    title: 'Toggle header column',
    command: ({ editor }) => {
      // You'll implement this
      editor.chain().focus().toggleHeaderColumn().run();
    },
  },
];

export const TableCommands = Extension.create<TableCommandsOptions>({
  name: 'tableCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }) => {
          props.command({ editor });

          // Delete the slash command text
          editor.chain().focus().deleteRange(range).run();
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

// Function to handle rendering the slash command suggestions
export const renderTableCommandsSuggestion = () => {
  let component: {
    refs: { [key: string]: HTMLElement };
    items: TableCommand[];
  };
  let popup: TippyInstance;

  return {
    // biome-ignore lint/suspicious/noExplicitAny:
    onStart: (props: any) => {
      component = {
        refs: {
          list: document.createElement('div'),
          wrapper: document.createElement('div'),
        },
        items: [],
      };

      component.refs.wrapper.classList.add('tablecommands-wrapper');
      component.refs.list.classList.add('tablecommands-list');
      component.refs.wrapper.appendChild(component.refs.list);

      popup = tippy('body', {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.refs.wrapper,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      })[0];
    },

    onUpdate(props: {
      items: TableCommand[];
      command: (command: TableCommand) => void;
    }) {
      console.log('update');
      component.items = props.items;

      // Clear the list
      component.refs.list.innerHTML = '';

      component.items.forEach((item: TableCommand, index: number) => {
        const commandButton = document.createElement('button');
        commandButton.classList.add('tablecommands-item');
        commandButton.innerHTML = `
          <div class="tablecommands-item-title">${item.title}</div>
        `;

        // Select the currently active item
        if (index === props.items.indexOf(props.items[0])) {
          commandButton.classList.add('is-selected');
        }

        commandButton.addEventListener('click', () => {
          props.command(item);
          popup.hide();
        });

        component.refs.list.appendChild(commandButton);
      });
    },

    onKeyDown(props: { event: KeyboardEvent }) {
      const { event } = props;
      // Escape closes the popup
      if (event.key === 'Escape') {
        popup.hide();
        return true;
      }

      // Arrow navigation
      if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
        console.log('arrow');
        const items = component.refs.list.querySelectorAll(
          '.tablecommands-item'
        );
        const currentIndex = Array.from(items).findIndex((item) =>
          item.classList.contains('is-selected')
        );

        if (event.key === 'ArrowUp') {
          const prevIndex = (currentIndex - 1 + items.length) % items.length;
          if (items[currentIndex])
            items[currentIndex].classList.remove('is-selected');
          if (items[prevIndex]) items[prevIndex].classList.add('is-selected');
          return true;
        }

        if (event.key === 'ArrowDown') {
          const nextIndex = (currentIndex + 1) % items.length;
          if (items[currentIndex])
            items[currentIndex].classList.remove('is-selected');
          if (items[nextIndex]) items[nextIndex].classList.add('is-selected');
          return true;
        }

        if (event.key === 'Enter') {
          const selectedItem = items[currentIndex] as HTMLElement;
          if (selectedItem) {
            selectedItem.click();
            return true;
          }
        }
      }

      return false;
    },

    onExit() {
      if (popup) {
        popup.destroy();
      }
    },
  };
};
