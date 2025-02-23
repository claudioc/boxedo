import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Feedback } from '~/../types';
import { ErrorWithFeedback } from '~/lib/errors';
import { Feedbacks } from '~/lib/feedbacks';
import { pathWithFeedback, slugUrl } from '~/lib/helpers';

export function redirectService(app: FastifyInstance, rep: FastifyReply) {
  return {
    bailWithError(code: number, message: unknown) {
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

    homeWithError(error: unknown) {
      let feedback: Feedback = Feedbacks.E_UNKNOWN_ERROR;
      if (error instanceof ErrorWithFeedback) {
        feedback = error.feedback;
        if (app) {
          app.log.error(feedback.message);
          app.log.error(error);
        }
      }

      return this.homeWithFeedback(feedback);
    },

    homeWithFeedback(feedback: Feedback) {
      return rep
        .header('Cache-Control', 'no-cache, no-store, must-revalidate')
        .header('Pragma', 'no-cache')
        .header('Expires', '0')
        .redirect(pathWithFeedback('/', feedback), 303);
    },

    slugWithFeedback(slug: string, feedback: Feedback) {
      if (app) {
        app.log.info(feedback.message);
      }

      return rep
        .header('Cache-Control', 'no-cache, no-store, must-revalidate')
        .header('Pragma', 'no-cache')
        .header('Expires', '0')
        .redirect(pathWithFeedback(slugUrl(slug), feedback), 303);
    },
  };
}
