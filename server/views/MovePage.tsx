import type { PageModel, WithCtx } from '~/../types';
import { slugUrl } from '~/lib/helpers';
import { SearchIcon } from '~/views/icons/SearchIcon';
import { Feedback, Feedbacks } from './components/Feedback';
import { MainContent } from './components/MainContent';
import { PageActions } from './components/PageActions';
import { Layout } from './Layout';

export interface MovePageProps extends WithCtx {
  page: PageModel;
  parent: PageModel | null;
  token: string;
}

export const MovePage = ({ ctx, token, page, parent }: MovePageProps) => {
  const { i18n } = ctx.app;

  return (
    <Layout
      ctx={ctx}
      title={i18n.t('MovePage.movingPage', { title: page.pageTitle })}
      page={page}
      context="moving page"
    >
      <MainContent>
        <div x-data="{newParentId: '', newParentTitle: '', moveToTop: false}">
          <div x-show="$store.has.errorOn('newParentId')">
            <Feedback ctx={ctx} feedback={Feedbacks.E_INVALID_PARENT_PAGE} />
          </div>

          <form action="" method="post" x-on:submit="App.validate">
            <PageActions
              ctx={ctx}
              title={i18n.t('MovePage.movingPage', { title: page.pageTitle })}
              actions={['save', 'cancel']}
              cancelUrl={slugUrl(page.pageSlug)}
            />
            <h1 class="title">{page.pageTitle}</h1>

            <p class="b-block">
              {i18n.t('MovePage.currentParentIs', {
                title: parent ? parent.pageTitle : i18n.t('MovePage.noParent'),
              })}
            </p>

            <p class="b-block" x-show="newParentId">
              {i18n.t('MovePage.newParentIs')} "
              <span x-text="newParentTitle" />"
            </p>

            <input type="hidden" name="moveToTop" x-model="moveToTop" />
            <input type="hidden" name="newParentId" x-model="newParentId" />
            <input type="hidden" name="_csrf" value={token} />
          </form>

          <div class="b-block">
            <label class="checkbox">
              <input type="checkbox" x-model="moveToTop" />{' '}
              {i18n.t('MovePage.moveToTop')}
            </label>
          </div>

          <div class="b-block" x-show="!moveToTop">
            <div class="field">
              <label class="label" for="search">
                {i18n.t('MovePage.searchNewParent')}
              </label>
            </div>
            <div class="control has-icons-left">
              <input
                class="input"
                autocomplete="off"
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
      </MainContent>
    </Layout>
  );
};
