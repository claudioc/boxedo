declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module 'fastify-mongodb-sanitizer' {
  import { FastifyPluginCallback } from 'fastify';
  const fastifyMongoSanitizer: FastifyPluginCallback;
  export default fastifyMongoSanitizer;
}
