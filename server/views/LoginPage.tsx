import type { FastifyInstance } from 'fastify';
import { LayoutMini } from './LayoutMini';
import { getFeedbackByCode, isFeedbackError } from '~/lib/feedbacks';
import { Feedback } from './components/Feedback';

interface LoginPageProps {
  app: FastifyInstance;
  token: string;
}

export const LoginPage = ({ app, token }: LoginPageProps) => {
  const { i18n, settings, feedbackCode } = app;

  const feedback = getFeedbackByCode(feedbackCode);

  return (
    <LayoutMini
      app={app}
      title={i18n.t('Login.loginTo', { siteTitle: settings.siteTitle })}
    >
      <div class="container">
        <Feedback app={app} feedback={feedback} />

        <h1 class="title">
          {i18n.t('Login.loginTo', { siteTitle: settings.siteTitle })}
        </h1>

        {feedback && !isFeedbackError(feedback) ? (
          <p>{i18n.t('Login.allGood')}</p>
        ) : (
          <form method="POST" action="/auth/login">
            <input type="hidden" name="_csrf" value={token} />
            <div class="field">
              <label class="label" for="email">
                {i18n.t('common.email')}
              </label>
              <div class="control">
                <input
                  autofocus="true"
                  class="input"
                  type="email"
                  name="email"
                  id="email"
                  placeholder={i18n.t('Login.enterEmail')}
                  required
                />
              </div>
              <p class="help">{i18n.t('Login.helpEmail')}</p>
            </div>
            <button class="button is-primary" type="submit">
              {i18n.t('Login.sendMagicLink')}
            </button>
          </form>
        )}
      </div>
    </LayoutMini>
  );
};
