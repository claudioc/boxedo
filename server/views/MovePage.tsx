import { Layout } from './Layout';
import { PageModel } from '~/types';
import { PageActions } from './components/PageActions';
import { slugUrl } from '~/lib/helpers';
import { Feedback, Feedbacks } from './components/Feedback';

export interface MovePageProps {
  page: PageModel;
  parent: PageModel;
}

export const MovePage = ({ page, parent }: MovePageProps) => (
  <Layout title={`Move ${page.pageTitle} to another parent`} page={page}>
    <div x-data="{newParentId: '', newParentTitle: 'n/a', error: {newParentId: false}}">
      <div x-show="error && error.newParentId" class="block">
        <Feedback feedback={Feedbacks.E_INVALID_PARENT_PAGE} />
      </div>

      <form action="" method="post" name="movePage" x-on:submit="App.validate">
        <PageActions
          actions={['save', 'cancel']}
          cancelUrl={slugUrl(page.pageSlug)}
        />
        <h1 class="title">{page.pageTitle}</h1>

        <p class="block">Current parent is "{parent.pageTitle}"</p>

        <p class="block">
          New parent is "<span x-text="newParentTitle"></span>"
        </p>

        <input type="hidden" name="newParentId" x-model="newParentId" />
        <input type="hidden" name="oldParentId" value={page.parentId!} />
      </form>

      <div class="block">
        <div class="field">
          <label class="label" for="search">
            Search for a new parent
          </label>
        </div>
        <div class="control">
          <input
            class="input"
            autoComplete="off"
            type="text"
            id="search"
            name="q"
            placeholder="Start typing…"
            hx-get="/parts/titles"
            hx-trigger="keyup changed delay:200ms"
            hx-target="next ul"
          />
        </div>
      </div>

      <ul x-on:click="newParentId = $event.target.dataset.pageId; newParentTitle = $event.target.innerText"></ul>
    </div>
  </Layout>
);
