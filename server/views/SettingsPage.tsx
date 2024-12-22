import { Layout } from './Layout';
import type { SettingsModel, PageModel } from '~/types';
import { PageActions } from './components/PageActions';
import { Feedback, Feedbacks } from './components/Feedback';
import { useApp } from '~/lib/context/App';
import { SearchIcon } from '~/views/icons/SearchIcon';

interface SettingsPageProps {
  settings: SettingsModel;
  landingPage: PageModel | null;
}

export const SettingsPage = ({ settings, landingPage }: SettingsPageProps) => {
  const { i18n } = useApp();

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
          <input type="hidden" name="landingPageId" x-model="landingPageId" />
        </form>

        <div class="block">
          <div class="block">
            {i18n.t('SettingsPage.currentLandingPageIs', {
              title: landingPage
                ? landingPage.pageTitle
                : i18n.t('SettingsPage.notSet'),
            })}
          </div>

          <div class="block" x-show="newLandingPageTitle">
            {i18n.t('SettingsPage.newLandingPageIs')} "
            <span x-text="newLandingPageTitle" />"
          </div>

          <div class="field">
            <label class="label" for="search">
              {i18n.t('SettingsPage.setLandingPage')}
            </label>
          </div>
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
              hx-target="next ul"
            />
            <span class="icon is-small is-left">
              <SearchIcon />
            </span>
          </div>
        </div>

        <ul x-on:click="landingPageId = $event.target.dataset.pageId; newLandingPageTitle = $event.target.dataset.pageTitle" />
      </div>
    </Layout>
  );
};
