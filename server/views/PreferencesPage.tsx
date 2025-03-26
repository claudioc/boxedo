import type { PreferencesModel, TextSize, WithCtx } from '~/../types';
import { mapTextSize } from '~/lib/helpers';
import { phraseDefinitions } from '~/locales/phrases';
import { MainContent } from './components/MainContent';
import { PageActions } from './components/PageActions';
import { LanguageIcon } from './icons/Language';
import { Layout } from './Layout';

interface PreferencesPageProps extends WithCtx {
  preferences: PreferencesModel;
  token: string;
}

export const PreferencesPage = ({
  ctx,
  preferences,
  token,
}: PreferencesPageProps) => {
  const { i18n } = ctx.app;
  const { siteLang } = preferences;

  return (
    <Layout ctx={ctx} title={i18n.t('SettingsPage.title')}>
      <form
        action=""
        method="post"
        name="preferencesPage"
        x-on:submit="App.validate"
      >
        <input type="hidden" name="_csrf" value={token} />
        <PageActions
          ctx={ctx}
          title={i18n.t('PreferencesPage.title')}
          actions={['save', 'cancel']}
          cancelUrl="/"
        />

        <MainContent>
          {ctx.user ? (
            <div class="mb-5">
              {i18n.t('PreferencesPage.welcome', {
                email: ctx.user.email,
                name: ctx.user.fullname,
                role: ctx.user.role,
              })}
            </div>
          ) : (
            ''
          )}

          <fieldset class="fieldset mb-5">
            <legend class="fieldset-legend">
              {i18n.t('PreferencesPage.textSize')}
            </legend>

            <div class="flex flex-row gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="textSize"
                  class="radio"
                  value={'S' satisfies TextSize}
                  checked={preferences.textSize === 'S'}
                />
                <span class={mapTextSize('S')}>
                  {i18n.t('PreferencesPage.small')}
                </span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="textSize"
                  class="radio"
                  value={'M' satisfies TextSize}
                  checked={preferences.textSize === 'M'}
                />
                <span class={mapTextSize('M')}>
                  {i18n.t('PreferencesPage.medium')}
                </span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="textSize"
                  class="radio"
                  value={'L' satisfies TextSize}
                  checked={preferences.textSize === 'L'}
                />
                <span class={mapTextSize('L')}>
                  {i18n.t('PreferencesPage.large')}
                </span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="textSize"
                  class="radio"
                  value={'XL' satisfies TextSize}
                  checked={preferences.textSize === 'XL'}
                />
                <span class={mapTextSize('XL')}>
                  {i18n.t('PreferencesPage.extraLarge')}
                </span>
              </label>
            </div>
            <div class="fieldset-label">
              {i18n.t('PreferencesPage.textSizeHelp')}
            </div>
          </fieldset>

          <fieldset class="fieldset mb-5">
            <legend class="fieldset-legend">
              <LanguageIcon /> {i18n.t('PreferencesPage.setLanguage')}
            </legend>
            <select name="siteLang" class="select">
              {phraseDefinitions.map((def) => (
                <option
                  selected={siteLang === def.language}
                  value={def.language}
                >
                  {def.name}
                </option>
              ))}
            </select>
          </fieldset>
        </MainContent>
      </form>
    </Layout>
  );
};
