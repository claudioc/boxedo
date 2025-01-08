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
      onEnd: async (evt) => {
        if (evt.oldIndex === evt.newIndex) {
          return;
        }

        const pageId = evt.item.querySelector('a')?.dataset.pageid;
        try {
          await fetch(`/reorder/${pageId}`, {
            method: 'POST',
            // Use a plain form request to avoid CORS preflight calls
            body: new URLSearchParams({
              targetIndex: evt.newIndex as unknown as string,
            }),
          });
        } catch (err) {
          console.error(err);
        }
      },
    });
  }
};

export const destroySortable = () => {
  if (sortable) {
    sortable.destroy();
  }
};
