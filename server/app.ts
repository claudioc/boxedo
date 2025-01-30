import bootstrap from './lib/bootstrap';
import { parseBaseUrl } from './lib/helpers';

const app = bootstrap();

const baseUrl = parseBaseUrl(app.config.BASE_URL);

try {
  await app.listen({
    port: baseUrl?.port ?? 3000,
    host: baseUrl?.hostname ?? 'localhost',
  });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
