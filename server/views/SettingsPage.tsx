import type { PageModel, SettingsModel, WithCtx } from '~/../types';
import { SearchIcon } from '~/views/icons/SearchIcon';
import { Feedback, Feedbacks } from './components/Feedback';
import { MainContent } from './components/MainContent';
import { PageActions } from './components/PageActions';
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
          </MainContent>
        </form>
      </div>
    </Layout>
  );
};
