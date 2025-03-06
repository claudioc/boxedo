const htmx = window.htmx;
let controller: AbortController;
// FIXME bad idea but we need to know if an error occurred since htmx doesn't persist this information
let htmxAjaxFailed = false;

const updateCreateButton = (pageId = '') => {
  if (!pageId) {
    return;
  }

  const createButton = document.querySelector(
    '.button[href*="/pages/create"]'
  ) as HTMLElement;

  if (createButton) {
    createButton.setAttribute('href', `/pages/create?parentPageId=${pageId}`);
    // As we are moving away from the landing page, the button label must be updated accordingly
    createButton.textContent = createButton.dataset.labelnested ?? '';
  }
};

const navigationHandlers = (_event: PageTransitionEvent) => {
  // Clean up old controller if it exists
  if (controller) {
    controller.abort();
  }

  controller = new AbortController();

  window.addEventListener(
    'popstate',
    () => {
      // FIXME this is a tragic way to just remove the active class
      // to the navigation menu when the user uses back/forward.
      setTimeout(() => {
        // The document currently displayed
        const page = document.querySelector(
          '#main-page-body [data-page-id]'
        ) as HTMLElement;
        if (!page) {
          return;
        }

        // The document currently highlighted in the navigation
        const active = document.querySelector(
          '.Layout_aside .is-active'
        ) as HTMLElement;

        const pageId = page.dataset?.pageId;
        if (active && active.dataset.pageId !== pageId) {
          active.classList.remove('is-active');
        }

        const nextActive = document.querySelector(
          `.Layout_aside [data-page-id="${pageId}"]`
        );

        if (nextActive) {
          nextActive.classList.add('is-active');
        }

        updateCreateButton(pageId);
      }, 200);
    },
    { signal: controller.signal }
  );

  // We intercept all the errors in here since a connection error won't trigger the htmx:responseError event
  document.body.addEventListener(
    'htmx:afterRequest',
    (event) => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const detail = (event as any).detail;
      if (!detail || !detail.xhr) {
        return;
      }

      htmxAjaxFailed = true;

      if (detail.xhr.status === 404) {
        alert('Page not found');
        return;
      }

      if (detail.xhr.status >= 500) {
        alert('An error occurred while loading the page. Please try again.');
        return;
      }

      if (detail.xhr.status === 0) {
        alert('Cannot establish a connection with the server.');
        return;
      }

      htmxAjaxFailed = false;
      // All good!
    },
    { signal: controller.signal }
  );
};

const setupHtmx = () => {
  // A set of actions to be taken when a new page has been loaded
  htmx.defineExtension('activate', {
    onEvent: (name: string, evt: Event) => {
      const el = evt.target as HTMLElement;
      if (!el || name !== 'htmx:xhr:loadend') {
        return;
      }

      if (htmxAjaxFailed) {
        return;
      }

      // FIXME this is a "make it works" solution but all the actions below should be handled
      // by a change the Alpine store

      // Activate the current page in the nav
      const [navElement, activeClass] = (el.dataset.activate ?? '').split('/');
      if (navElement && activeClass) {
        el.closest(navElement)
          ?.querySelectorAll(`.${activeClass}`)
          .forEach((el) => el.classList.remove(activeClass));

        el.parentElement?.classList.add(activeClass);
      }

      // Update the main context
      const context = el.dataset.context;
      if (context) {
        const el = document.querySelector('main');
        if (el) {
          el.dataset.context = context;
        }
      }

      // Update the create button's href (the very first value is set in the Layout.tsx file)
      updateCreateButton(el.dataset.pageId);

      // Rebind sortable to the closest UL
      window.App.enableSortable(el.closest('ul'));
    },
  });

  window.removeEventListener('pageshow', navigationHandlers);
  window.addEventListener('pageshow', navigationHandlers);
};

if (htmx) {
  setupHtmx();
}
