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

interface TableCommandsProps {
  items: TableCommand[];
  command: (command: TableCommand) => void;
}

// List of table commands that will be shown in the slash menu
export const tableCommands: TableCommand[] = [
  {
    title: 'Add row above',
    command: ({ editor }) => {
      editor.chain().focus().addRowBefore().run();
    },
  },
  {
    title: 'Add row below',
    command: ({ editor }) => {
      editor.chain().focus().addRowAfter().run();
    },
  },
  {
    title: 'Add column left',
    command: ({ editor }) => {
      editor.chain().focus().addColumnBefore().run();
    },
  },
  {
    title: 'Add column right',
    command: ({ editor }) => {
      editor.chain().focus().addColumnAfter().run();
    },
  },
  {
    title: 'Delete row',
    command: ({ editor }) => {
      editor.chain().focus().deleteRow().run();
    },
  },
  {
    title: 'Delete column',
    command: ({ editor }) => {
      editor.chain().focus().deleteColumn().run();
    },
  },
  {
    title: 'Delete table',
    command: ({ editor }) => {
      editor.chain().focus().deleteTable().run();
    },
  },
  {
    title: 'Merge cells',
    command: ({ editor }) => {
      editor.chain().focus().mergeCells().run();
    },
  },
  {
    title: 'Split cell',
    command: ({ editor }) => {
      editor.chain().focus().splitCell().run();
    },
  },
  {
    title: 'Toggle header row',
    command: ({ editor }) => {
      editor.chain().focus().toggleHeaderRow().run();
    },
  },
  {
    title: 'Toggle header column',
    command: ({ editor }) => {
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

  const renderComponent = (props: TableCommandsProps) => {
    component.refs.list.innerHTML = '';
    component.items = props.items;

    component.items.forEach((item: TableCommand, _: number) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.tabIndex = 0;
      li.classList.add('j-table-cmd-item');
      btn.innerHTML = item.title;
      btn.addEventListener('click', () => {
        popup.hide();
        props.command(item);
      });
      li.appendChild(btn);
      component.refs.list.appendChild(li);
    });
  };

  return {
    // biome-ignore lint/suspicious/noExplicitAny:
    onStart: (props: any) => {
      if (!props.clientRect) {
        return;
      }

      component = {
        refs: {
          list: document.createElement('ul'),
          wrapper: document.createElement('div'),
        },
        items: props.items,
      };

      component.refs.wrapper.classList.add('j-table-cmd-wrapper');
      component.refs.list.classList.add('j-table-cmd-list');
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

      renderComponent(props);
    },

    onUpdate(props: TableCommandsProps) {
      renderComponent(props);
    },

    onKeyDown(props: { event: KeyboardEvent }) {
      const { event } = props;
      if (event.key === 'Escape') {
        popup.hide();
        return true;
      }

      if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
        const items = component.refs.list.querySelectorAll('.j-table-cmd-item');
        const currentIndex = Array.from(items).findIndex((item) =>
          item.classList.contains('j-table-cmd-item-active')
        );

        if (event.key === 'ArrowUp') {
          const prevIndex = (currentIndex - 1 + items.length) % items.length;
          if (items[currentIndex]) {
            items[currentIndex].classList.remove('j-table-cmd-item-active');
          }

          if (items[prevIndex]) {
            items[prevIndex].classList.add('j-table-cmd-item-active');
          }

          return true;
        }

        if (event.key === 'ArrowDown') {
          const nextIndex = (currentIndex + 1) % items.length;

          if (items[currentIndex]) {
            items[currentIndex].classList.remove('j-table-cmd-item-active');
          }

          if (items[nextIndex]) {
            items[nextIndex].classList.add('j-table-cmd-item-active');
          }

          return true;
        }

        if (event.key === 'Enter') {
          const selectedItem = items[currentIndex] as HTMLElement;
          if (selectedItem) {
            const btn = selectedItem.querySelector('button');
            if (btn) {
              btn.click();
              return true;
            }
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
