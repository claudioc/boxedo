import Alpine from 'alpinejs';

Alpine.start();

if (LIVERELOAD_URL) {
  new EventSource(LIVERELOAD_URL).addEventListener('message', () =>
    location.reload()
  );
}
