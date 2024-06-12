import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

interface Query {
  f?: string;
}

async function feedbackPlugin(fastify: FastifyInstance) {
  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest<{ Querystring: Query }>) => {
      fastify.feedbackCode = 0;
      if (request.query.f) {
        fastify.feedbackCode = Number(request.query.f);
      }
    }
  );
}

export default fp(feedbackPlugin);
