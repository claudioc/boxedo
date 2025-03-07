import type { PageModel, SettingsModel, TextSize, WithCtx } from '~/../types';
import { mapTextSize } from '~/lib/helpers';
import { phraseDefinitions } from '~/locales/phrases';
import { SearchIcon } from '~/views/icons/SearchIcon';
import { Feedback, Feedbacks } from './components/Feedback';
import { MainContent } from './components/MainContent';
import { PageActions } from './components/PageActions';
import { LanguageIcon } from './icons/Language';
import { Layout } from './Layout';

interface SettingsPageProps extends WithCtx {
  settings: SettingsModel;
  landingPage: PageModel | null;
  token: string;
}

export const SettingsPage = ({
  ctx,
  settings,
  landingPage,
  token,
}: SettingsPageProps) => {
  const { i18n } = ctx.app;
  const { siteLang } = settings;

  return (
    <Layout ctx={ctx} title={i18n.t('SettingsPage.title')}>
      <div
        x-data={`{landingPageId: '${landingPage ? landingPage._id : ''}', newLandingPageTitle: '', error: {landingPageId: false}}`}
      >
        <div x-show="error && error.landingPageId" class="mb-5">
          <Feedback ctx={ctx} feedback={Feedbacks.E_INVALID_PARENT_PAGE} />
        </div>

        <form
          action=""
          method="post"
          name="settingsPage"
          x-on:submit="App.validate"
        >
          <PageActions
            ctx={ctx}
            title={i18n.t('SettingsPage.title')}
            actions={['save', 'cancel']}
            cancelUrl="/"
          />

          <MainContent>
            <fieldset class="fieldset mb-5">
              <legend>{i18n.t('SettingsPage.siteTitle')}</legend>
              <input
                name="siteTitle"
                class="input w-full"
                type="text"
                value={settings.siteTitle}
                aria-describedby="sitetitle-alt"
              />
              <div class="fieldset-label" id="sitetitle-alt">
                {i18n.t('SettingsPage.siteTitleHelp')}
              </div>
            </fieldset>

            <input type="hidden" name="landingPageId" x-model="landingPageId" />
            <input type="hidden" name="_csrf" value={token} />

            <div class="mb-5">
              {i18n.t('SettingsPage.currentLandingPageIs', {
                title: landingPage
                  ? landingPage.pageTitle
                  : i18n.t('SettingsPage.notSet'),
              })}
            </div>

            <div class="mb-5" x-show="newLandingPageTitle">
              {i18n.t('SettingsPage.newLandingPageIs')} "
              <span x-text="newLandingPageTitle" />"
            </div>

            <fieldset class="fieldset">
              <legend>{i18n.t('SettingsPage.setLandingPage')}</legend>
              <label class="input w-full">
                <SearchIcon />
                <input
                  autocomplete="off"
                  type="search"
                  id="search"
                  name="q"
                  placeholder={i18n.t('SettingsPage.startTyping')}
                  hx-get="/parts/titles"
                  hx-trigger="keyup changed delay:200ms"
                  hx-target="next div.results"
                />
              </label>
            </fieldset>

            <div
              class="mb-5 results"
              x-ref="results"
              x-on:click="landingPageId = $event.target.dataset.pageId; newLandingPageTitle = $event.target.dataset.pageTitle; $refs.results.innerHTML = ''"
            />

            <fieldset class="fieldset mb-5">
              <legend class="fieldset-legend">
                {i18n.t('SettingsPage.textSize')}
              </legend>

              <div class="flex flex-row gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="textSize"
                    class="radio"
                    value={'S' satisfies TextSize}
                    checked={settings.textSize === 'S'}
                  />
                  <span class={mapTextSize('S')}>
                    {i18n.t('SettingsPage.small')}
                  </span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="textSize"
                    class="radio"
                    value={'M' satisfies TextSize}
                    checked={settings.textSize === 'M'}
                  />
                  <span class={mapTextSize('M')}>
                    {i18n.t('SettingsPage.medium')}
                  </span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="textSize"
                    class="radio"
                    value={'L' satisfies TextSize}
                    checked={settings.textSize === 'L'}
                  />
                  <span class={mapTextSize('L')}>
                    {i18n.t('SettingsPage.large')}
                  </span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="textSize"
                    class="radio"
                    value={'XL' satisfies TextSize}
                    checked={settings.textSize === 'XL'}
                  />
                  <span class={mapTextSize('XL')}>
                    {i18n.t('SettingsPage.extraLarge')}
                  </span>
                </label>
              </div>
              <div class="fieldset-label">
                {i18n.t('SettingsPage.textSizeHelp')}
              </div>
            </fieldset>

            <fieldset class="fieldset mb-5">
              <legend class="fieldset-legend">
                <LanguageIcon /> {i18n.t('SettingsPage.setLanguage')}
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
      </div>
    </Layout>
  );
};
