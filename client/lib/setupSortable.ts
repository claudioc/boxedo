import Sortable from 'sortablejs';

let sortable: Sortable | null = null;

export const enableSortable = (el?: HTMLElement) => {
  // Activate sortable on the nav
  const mainNav =
    el ??
    (document.querySelector(
      '[data-ref="main-navigation-tree"]'
    ) as HTMLElement);

  if (!mainNav) {
    return;
  }

  sortable = Sortable.create(mainNav, {
    handle: '.sortable-handle',
    ghostClass: 'sortable-ghost',
    animation: 150,
    onEnd: async (evt) => {
      if (evt.oldIndex === evt.newIndex) {
        return;
      }

      const pageId = evt.item.querySelector('a')?.dataset.pageId;
      try {
        await fetch(`/pages/${pageId}/reorder`, {
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
};

export const destroySortable = () => {
  if (sortable) {
    sortable.destroy();
  }
};
