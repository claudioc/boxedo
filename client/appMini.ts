import Alpine from 'alpinejs';

Alpine.start();

if (BXD_LIVERELOAD_URL) {
  new EventSource(BXD_LIVERELOAD_URL).addEventListener('message', () =>
    location.reload()
  );
}
