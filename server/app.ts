import bootstrap from './lib/bootstrap';

const app = bootstrap();

try {
  await app.listen({
    port: Number(process.env.PORT || 3000),
    host: process.env.ADDRESS || 'localhost',
  });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
