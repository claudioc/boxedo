import { FastifyInstance, FastifyReply } from 'fastify';
import { ErrorWithFeedback } from '~/lib/errors';
import { Feedbacks } from '~/lib/feedbacks';
import { Feedback } from '~/types';
import { pathWithFeedback, slugUrl } from '~/lib/helpers';

export function redirectService(app: FastifyInstance, rep: FastifyReply) {
  return {
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
      return rep.redirect(303, pathWithFeedback('/', feedback));
    },

    slugWithFeedback(slug: string, feedback: Feedback) {
      if (app) {
        app.log.error(feedback.message);
      }

      return rep.redirect(303, pathWithFeedback(slugUrl(slug), feedback));
    },
  };
}
