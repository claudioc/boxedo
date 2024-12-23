import { Layout } from './Layout';
import type { PageModel } from '~/types';
import { PageActions } from './components/PageActions';
import { slugUrl } from '~/lib/helpers';
import { Feedback, Feedbacks } from './components/Feedback';
import { useApp } from '~/lib/context/App';
import { SearchIcon } from '~/views/icons/SearchIcon';

export interface MovePageProps {
  page: PageModel;
  parent: PageModel | null;
}

export const MovePage = ({ page, parent }: MovePageProps) => {
  const { i18n } = useApp();

  return (
    <Layout
      title={i18n.t('MovePage.movingPage', { title: page.pageTitle })}
      page={page}
    >
      <div x-data="{newParentId: '', newParentTitle: '', error: {newParentId: false}}">
        <div x-show="error && error.newParentId" class="block">
          <Feedback feedback={Feedbacks.E_INVALID_PARENT_PAGE} />
        </div>

        <form
          action=""
          method="post"
          name="movePage"
          x-on:submit="App.validate"
        >
          <PageActions
            title={i18n.t('MovePage.movingPage', { title: page.pageTitle })}
            actions={['save', 'cancel']}
            cancelUrl={slugUrl(page.pageSlug)}
          />
          <h1 class="title">{page.pageTitle}</h1>

          <p class="block">
            {i18n.t('MovePage.currentParentIs', {
              title: parent ? parent.pageTitle : i18n.t('MovePage.noParent'),
            })}
          </p>

          <p class="block" x-show="newParentId">
            {i18n.t('MovePage.newParentIs')} "
            <span x-text="newParentTitle" />"
          </p>

          <input type="hidden" name="newParentId" x-model="newParentId" />
          <input type="hidden" name="oldParentId" value={page.parentId ?? ''} />
        </form>

        <div class="block">
          <div class="field">
            <label class="label" for="search">
              {i18n.t('MovePage.searchNewParent')}
            </label>
          </div>
          <div class="control has-icons-left">
            <input
              class="input"
              autoComplete="off"
              type="text"
              id="search"
              name="q"
              placeholder={i18n.t('MovePage.startTyping')}
              hx-get="/parts/titles"
              hx-trigger="keyup changed delay:200ms"
              hx-target="next div.results"
            />
            <span class="icon is-small is-left">
              <SearchIcon />
            </span>
          </div>
        </div>

        <div
          class="results"
          x-on:click="newParentId = $event.target.dataset.pageId; newParentTitle = $event.target.dataset.pageTitle"
        />
      </div>
    </Layout>
  );
};
