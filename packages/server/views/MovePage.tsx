import type { PageModel, WithCtx } from 'boxedo-core/types';
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
  const { i18n, urlService } = ctx.app;

  return (
    <Layout
      ctx={ctx}
      title={i18n.t('MovePage.movingPage', { title: page.pageTitle })}
      page={page}
      context="moving page"
    >
      <form action="" method="post" x-on:submit="App.validate">
        <PageActions
          ctx={ctx}
          title={i18n.t('MovePage.movingPage', { title: page.pageTitle })}
          actions={['save', 'cancel']}
          cancelUrl={urlService.slugUrl(page.pageSlug)}
        />
        <MainContent>
          <div x-data="{newParentId: '', newParentTitle: '', moveToTop: false}">
            <input type="hidden" name="moveToTop" x-model="moveToTop" />
            <input type="hidden" name="newParentId" x-model="newParentId" />
            <input type="hidden" name="_csrf" value={token} />

            <div x-show="$store.has.errorOn('newParentId')">
              <Feedback ctx={ctx} feedback={Feedbacks.E_INVALID_PARENT_PAGE} />
            </div>

            <h1 class="text-3xl mb-5">{page.pageTitle}</h1>

            {/* biome-ignore lint/a11y/useSemanticElements: */}
            <div role="alert" class="alert alert-info alert-outline mb-5 ">
              {i18n.t('MovePage.currentParentIs', {
                title: parent ? parent.pageTitle : i18n.t('MovePage.noParent'),
              })}
            </div>

            <div class="mb-4">
              <fieldset class="fieldset">
                <label class="input input-ghost">
                  <input type="checkbox" class="checkbox" x-model="moveToTop" />
                  {i18n.t('MovePage.moveToTop')}
                </label>
              </fieldset>
            </div>

            <div x-show="!moveToTop">
              <div class="divider uppercase m-0 mb-5">
                {i18n.t('common.or')}
              </div>

              {/* biome-ignore lint/a11y/useSemanticElements: */}
              <div
                role="alert"
                class="alert alert-success alert-outline mb-5 "
                x-show="newParentId"
              >
                {i18n.t('MovePage.newParentIs')}
                <span x-text="`&quot;` + newParentTitle + `&quot;`" />
              </div>

              <fieldset class="fieldset">
                <legend>{i18n.t('MovePage.searchNewParent')} </legend>
                <label class="input w-full">
                  <SearchIcon />
                  <input
                    autocomplete="off"
                    type="search"
                    id="search"
                    name="q"
                    placeholder={i18n.t('MovePage.startTyping')}
                    hx-get={urlService.url('/parts/titles')}
                    hx-trigger="keyup changed delay:200ms"
                    hx-target="next div.results"
                  />
                </label>
              </fieldset>

              <div
                class="results mb-5"
                x-ref="results"
                x-on:click="newParentId = $event.target.dataset.pageId; newParentTitle = $event.target.dataset.pageTitle; $refs.results.innerHTML = ''"
              />
            </div>
          </div>
        </MainContent>
      </form>
    </Layout>
  );
};
