import Sortable from 'sortablejs';

let sortable: Sortable | null = null;

export const enableSortable = (el?: HTMLElement) => {
  // Activate sortable on the nav
  const mainNav =
    el ?? (document.querySelector('#main-navigation > ul') as HTMLElement);

  if (mainNav) {
    sortable = Sortable.create(mainNav, {
      handle: '.sortable-handle',
      ghostClass: 'sortable-ghost',
      animation: 150,
      onEnd: (evt) => {
        console.log([...evt.to.children]);
      },
    });
  }
};

export const destroySortable = () => {
  if (sortable) {
    sortable.destroy();
  }
};
