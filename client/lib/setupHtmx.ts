const htmx = window.htmx;

if (htmx) {
  htmx.defineExtension('activate', {
    onEvent: (name: string, evt: Event) => {
      const el = evt.target as HTMLElement;
      if (!el || name !== 'htmx:xhr:loadend') {
        return;
      }
      const [parent, activeClass] = (el.dataset.activate || '').split('/');
      if (!parent || !activeClass) {
        return;
      }

      el.closest(parent)
        ?.querySelectorAll(`.${activeClass}`)
        .forEach((el) => el.classList.remove(activeClass));

      el.classList.add(activeClass);
    },
  });
}
