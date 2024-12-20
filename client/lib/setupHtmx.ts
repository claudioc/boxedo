const htmx = window.htmx;

// FIXME bad idea but we need to know if an error occurred since htmx doesn't persist this information
let htmxAjaxFailed = false;

if (htmx) {
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

  // We intercept all the errors in here since a connection error won't trigger the htmx:responseError event
  document.body.addEventListener('htmx:afterRequest', (event) => {
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
  });
}
