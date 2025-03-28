import bootstrap from './lib/bootstrap';
import { parseBaseUrl } from './lib/helpers';

const app = bootstrap();

const baseUrl = parseBaseUrl(app.config.JNGL_BASE_INTERNAL_URL);
if (!baseUrl) {
  app.log.error('The configured internal base url is incorrect.');
  process.exit(1);
}

try {
  await app.listen({
    port: baseUrl?.port ?? 3000,
    host: baseUrl?.hostname ?? 'localhost',
  });
  process.on('SIGTERM', async () => {
    try {
      await app.close();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
