import { Layout } from './Layout';
import type { SettingsModel, PageModel, WithCtx, TextSize } from '~/../types';
import { PageActions } from './components/PageActions';
import { Feedback, Feedbacks } from './components/Feedback';
import { SearchIcon } from '~/views/icons/SearchIcon';
import { LanguageIcon } from './icons/Language';
import { MainContent } from './components/MainContent';
import { phraseDefinitions } from '~/locales/phrases';

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
        <div x-show="error && error.landingPageId" class="block">
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
            <div class="block">
              <div class="field">
                <label class="label" for="search">
                  {i18n.t('SettingsPage.siteTitle')}
                </label>
                <div class="control">
                  <input
                    name="siteTitle"
                    class="input"
                    type="text"
                    value={settings.siteTitle}
                  />
                </div>
                <p class="help">{i18n.t('SettingsPage.siteTitleHelp')}</p>
              </div>
            </div>

            <input type="hidden" name="landingPageId" x-model="landingPageId" />
            <input type="hidden" name="_csrf" value={token} />

            <div class="block">
              <p>
                {i18n.t('SettingsPage.currentLandingPageIs', {
                  title: landingPage
                    ? landingPage.pageTitle
                    : i18n.t('SettingsPage.notSet'),
                })}
              </p>

              <div class="block" x-show="newLandingPageTitle">
                {i18n.t('SettingsPage.newLandingPageIs')} "
                <span x-text="newLandingPageTitle" />"
              </div>

              <div class="field">
                <label class="label" for="search">
                  {i18n.t('SettingsPage.setLandingPage')}
                </label>
                <div class="control has-icons-left">
                  <input
                    class="input"
                    autocomplete="off"
                    type="text"
                    id="search"
                    name="q"
                    placeholder={i18n.t('SettingsPage.startTyping')}
                    hx-get="/parts/titles"
                    hx-trigger="keyup changed delay:200ms"
                    hx-target="next div.results"
                  />
                  <span class="icon is-small is-left">
                    <SearchIcon />
                  </span>
                </div>
              </div>
            </div>

            <div
              class="block results"
              x-on:click="landingPageId = $event.target.dataset.pageId; newLandingPageTitle = $event.target.dataset.pageTitle"
            />

            <div class="block">
              <div class="field">
                <div class="label">{i18n.t('SettingsPage.textSize')}</div>
                <div class="radios control">
                  <label class="radio">
                    <input
                      type="radio"
                      name="textSize"
                      class="mr-1"
                      value={'S' satisfies TextSize}
                      checked={settings.textSize === 'S'}
                    />
                    {i18n.t('SettingsPage.small')}
                  </label>
                  <label class="radio">
                    <input
                      type="radio"
                      name="textSize"
                      class="mr-1"
                      value={'M' satisfies TextSize}
                      checked={settings.textSize === 'M'}
                    />
                    {i18n.t('SettingsPage.medium')}
                  </label>
                  <label class="radio">
                    <input
                      type="radio"
                      name="textSize"
                      class="mr-1"
                      value={'L' satisfies TextSize}
                      checked={settings.textSize === 'L'}
                    />
                    {i18n.t('SettingsPage.large')}
                  </label>
                  <label class="radio">
                    <input
                      type="radio"
                      name="textSize"
                      class="mr-1"
                      value={'XL' satisfies TextSize}
                      checked={settings.textSize === 'XL'}
                    />
                    {i18n.t('SettingsPage.extraLarge')}
                  </label>
                </div>
                <p class="help">{i18n.t('SettingsPage.textSizeHelp')}</p>
              </div>
            </div>

            <div class="field">
              <label class="label" for="search">
                {i18n.t('SettingsPage.setLanguage')}
              </label>
              <div class="control has-icons-left">
                <span class="select">
                  <select name="siteLang">
                    {phraseDefinitions.map((def) => (
                      <option
                        selected={siteLang === def.language}
                        value={def.language}
                      >
                        {def.name}
                      </option>
                    ))}
                  </select>
                </span>
                <span class="icon is-small is-left">
                  <LanguageIcon />
                </span>
              </div>
            </div>
          </MainContent>
        </form>
      </div>
    </Layout>
  );
};
