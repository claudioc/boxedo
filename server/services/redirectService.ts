import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Feedback } from '~/../types';
import { ErrorWithFeedback } from '~/lib/errors';
import { pathWithFeedback, slugUrl } from '~/lib/helpers';

export function redirectService(app: FastifyInstance, rep: FastifyReply) {
  return {
    bail(code: number, message: unknown) {
      app.log.error(message);
      if (message instanceof ErrorWithFeedback) {
        app.log.error(message.feedback.message);
        return rep.code(code).send({
          error: message.feedback.message,
          statusCode: code,
        });
      }

      return rep.code(code).send({
        error: message,
      });
    },

    path(path: string, feedback: Feedback, noCache = false) {
      const finalPath = pathWithFeedback(path, feedback);
      if (noCache) {
        return rep.redirect(finalPath, 303);
      }

      return rep
        .header('Cache-Control', 'no-cache, no-store, must-revalidate')
        .header('Pragma', 'no-cache')
        .header('Expires', '0')
        .redirect(finalPath, 303);
    },

    home(feedback: Feedback) {
      this.path('/', feedback, true);
    },

    slug(slug: string, feedback: Feedback) {
      this.path(slugUrl(slug), feedback, true);
    },
  };
}
