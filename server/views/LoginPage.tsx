import type { WithCtx } from '~/../types';
import { getFeedbackByCode, isFeedbackError } from '~/lib/feedbacks';
import { Feedback } from './components/Feedback';
import { EmailIcon } from './icons/EmailIcon';
import { LayoutMini } from './LayoutMini';

interface LoginPageProps extends WithCtx {
  token: string;
}

export const LoginPage = ({ ctx, token }: LoginPageProps) => {
  const { i18n, settings, feedbackCode, urlService } = ctx.app;

  const feedback = getFeedbackByCode(feedbackCode);

  return (
    <LayoutMini
      ctx={ctx}
      title={i18n.t('Login.loginTo', { siteTitle: settings.siteTitle })}
    >
      <div class="prose prose-headings:mt-0 -mt-48">
        <Feedback ctx={ctx} feedback={feedback} />

        <h2>{i18n.t('Login.loginTo', { siteTitle: settings.siteTitle })}</h2>

        {feedback && !isFeedbackError(feedback) ? (
          <p class="flex gap-2">
            <EmailIcon title={i18n.t('Login.allGood')} />
            {i18n.t('Login.allGood')}
          </p>
        ) : (
          <form method="POST" action={urlService.url('/auth/login')}>
            <input type="hidden" name="_csrf" value={token} />

            <div>
              <label class="input">
                {i18n.t('common.email')}
                <input
                  autofocus
                  type="email"
                  class="grow"
                  name="email"
                  placeholder={i18n.t('Login.enterEmail')}
                  required
                  aria-describedby="email-alt"
                />
              </label>
              <p id="email-alt" class="text-sm text-gray-400">
                {i18n.t('Login.helpEmail')}
              </p>
            </div>
            <button class="btn btn-primary" type="submit">
              {i18n.t('Login.sendMagicLink')}
            </button>
          </form>
        )}
      </div>
    </LayoutMini>
  );
};
