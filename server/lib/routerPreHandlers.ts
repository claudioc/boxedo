import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify';
import type { Capability } from '~/../types';
import { ANONYMOUS_AUTHOR_ID, SESSION_COOKIE_NAME } from '~/constants';
import { AuthorizationService } from '~/services/AuthorizationService';

export const createRequireAuth = (app: FastifyInstance) => {
  return async (req: FastifyRequest, rep: FastifyReply) => {
    const { config, repoFactory: repos } = app;
    const userRepo = repos.getUserRepository();
    const sessionRepo = repos.getSessionRepository();
    const preferencesRepo = repos.getPreferencesRepository();

    req.user = null;

    if (app.is('test') || config.BXD_AUTHENTICATION_TYPE === 'none') {
      const prefs = (
        await preferencesRepo.getPreferencesByUserId(ANONYMOUS_AUTHOR_ID)
      ).match(
        (prefs) => prefs,
        (feedback) => {
          throw new Error(feedback.message);
        }
      );
      app.i18n.switchTo(prefs.siteLang);
      req.preferences = prefs;
      return;
    }

    const sessionId = req.cookies.session;

    if (!sessionId) {
      return rep.redirect('/auth/login');
    }

    const session = (await sessionRepo.getSessionById(sessionId)).match(
      (session) => session,
      (feedback) => {
        throw new Error(feedback.message);
      }
    );

    if (!session || new Date(session.expiresAt) < new Date()) {
      rep.clearCookie(SESSION_COOKIE_NAME);
      return rep.redirect('/auth/login');
    }

    const user = (await userRepo.getUserByEmail(session.email)).match(
      (user) => user,
      (feedback) => {
        throw new Error(feedback.message);
      }
    );

    if (!user) {
      rep.clearCookie(SESSION_COOKIE_NAME);
      return rep.redirect('/auth/login');
    }

    const prefs = (
      await preferencesRepo.getPreferencesByUserId(user._id)
    ).match(
      (prefs) => prefs,
      (feedback) => {
        throw new Error(feedback.message);
      }
    );

    app.i18n.switchTo(prefs.siteLang);

    req.preferences = prefs;
    req.user = user;
  };
};

export const createRequireCsrf = (app: FastifyInstance) => {
  return (
    req: FastifyRequest,
    rep: FastifyReply,
    done: HookHandlerDoneFunction
  ) => {
    if (app.is('test')) {
      done();
      return;
    }

    return app.csrfProtection.call(app, req, rep, done);
  };
};

export const createRequireCapability = (_app: FastifyInstance) => {
  const authService = AuthorizationService.getInstance();

  return (capability: Capability) => {
    return (
      req: FastifyRequest,
      _rep: FastifyReply,
      done: HookHandlerDoneFunction
    ) => {
      if (!authService.hasCapability(req.user, capability)) {
        throw new Error("You don't have the rights to access this resource", {
          cause: 403,
        });
      }

      done();
    };
  };
};
