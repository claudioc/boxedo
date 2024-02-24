import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

const methodOverridePlugin: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  fastify.addHook('preValidation', (request: FastifyRequest, _reply, done) => {
    // TypeScript recognizes `request.body` as `any` by default, so you might need to assert the type
    const body = request.body as { _method?: string };

    if (!body) {
      done();
      return;
    }

    // Check if the request is a POST request and if the method in the body is "put"
    if (request.method === 'POST' && body._method === 'put') {
      console.log(request.method, 'request.body');
      // Change the request method to PUT
      // TypeScript does not allow changing `request.method` directly, so use `request.raw.method`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (request.raw as any).method = 'PUT';
    }
    done();
  });
};

// Use `fp` for plugin encapsulation and TypeScript support
export default fp(methodOverridePlugin);
