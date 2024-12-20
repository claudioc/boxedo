const htmx = window.htmx;

if (htmx) {
  // A set of actions to be taken when a new page has been loaded
  htmx.defineExtension('activate', {
    onEvent: (name: string, evt: Event) => {
      const el = evt.target as HTMLElement;
      if (!el || name !== 'htmx:xhr:loadend') {
        return;
      }

      // Activate the current page in the nav
      const [parent, activeClass] = (el.dataset.activate ?? '').split('/');
      if (parent && activeClass) {
        el.closest(parent)
          ?.querySelectorAll(`.${activeClass}`)
          .forEach((el) => el.classList.remove(activeClass));

        el.classList.add(activeClass);
      }

      // Update the main context
      const context = el.dataset.context;
      if (context) {
        const el = document.querySelector('main');
        if (el) {
          el.dataset.context = context;
        }
      }

      // Update the create button's href
      const pageId = el.dataset.pageid;
      if (pageId) {
        const createButton = document.querySelector(
          '.button[href*="/create/"]'
        );
        if (createButton) {
          createButton.setAttribute('href', `/create/${pageId}`);
        }
      }
    },
  });
}
