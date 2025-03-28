import Alpine from 'alpinejs';

Alpine.start();

if (JNGL_LIVERELOAD_URL) {
  new EventSource(JNGL_LIVERELOAD_URL).addEventListener('message', () =>
    location.reload()
  );
}
