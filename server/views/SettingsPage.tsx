import { Layout } from './Layout';
import type { SettingsModel, PageModel } from '~/types';
import { PageActions } from './components/PageActions';
import { Feedback, Feedbacks } from './components/Feedback';
import { useApp } from '~/lib/context/App';
import { SearchIcon } from '~/views/icons/SearchIcon';
import { LanguageIcon } from './icons/Language';

interface SettingsPageProps {
  settings: SettingsModel;
  landingPage: PageModel | null;
}

export const SettingsPage = ({ settings, landingPage }: SettingsPageProps) => {
  const { i18n } = useApp();
  const { siteLang } = settings;

  return (
    <Layout title={i18n.t('SettingsPage.title')}>
      <div
        x-data={`{landingPageId: '${landingPage ? landingPage._id : ''}', newLandingPageTitle: '', error: {landingPageId: false}}`}
      >
        <div x-show="error && error.landingPageId" class="block">
          <Feedback feedback={Feedbacks.E_INVALID_PARENT_PAGE} />
        </div>

        <form
          action=""
          method="post"
          name="settingsPage"
          x-on:submit="App.validate"
        >
          <PageActions
            title={i18n.t('SettingsPage.title')}
            actions={['save', 'cancel']}
            cancelUrl="/"
          />

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
                  autoComplete="off"
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

          <div class="field">
            <label class="label" for="search">
              {i18n.t('SettingsPage.setLanguage')}
            </label>
            <div class="control has-icons-left">
              <span class="select">
                <select name="siteLang" value={siteLang}>
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                </select>
              </span>
              <span class="icon is-small is-left">
                <LanguageIcon />
              </span>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};
