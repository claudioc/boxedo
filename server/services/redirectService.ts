import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Feedback } from '~/../types';
import { ErrorWithFeedback } from '~/lib/errors';
import { pathWithFeedback, slugUrl, urlify } from '~/lib/helpers';

export const redirectService = (app: FastifyInstance, rep: FastifyReply) => {
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

    // Decision: the path urlification is always made when the url
    // is passed to this function, not here inside to avoid the risk
    // of "double" urlification
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

    home(feedback?: Feedback) {
      const root = urlify('/', app.config.JNGL_BASE_EXTERNAL_URL);

      if (!feedback) {
        return rep.redirect(root, 303);
      }
      return this.path(root, feedback, true);
    },

    slug(slug: string, feedback: Feedback) {
      this.path(
        slugUrl(slug, app.config.JNGL_BASE_EXTERNAL_URL),
        feedback,
        true
      );
    },
  };
};
