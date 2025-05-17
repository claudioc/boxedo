import { parseBaseUrl } from 'boxedo-core/lib/helpers';
import bootstrap from './lib/bootstrap';

const app = bootstrap();

const baseUrl = parseBaseUrl(app.config.BXD_BASE_INTERNAL_URL);

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
