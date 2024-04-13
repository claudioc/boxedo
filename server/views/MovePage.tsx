import { Layout } from './Layout';
import { PageModel } from '~/types';

export interface MovePageProps {
  page: PageModel;
  parent: PageModel;
}

export const MovePage = ({ page, parent }: MovePageProps) => (
  <Layout
    hasMenu={false}
    title={`Move ${page.pageTitle} to another parent`}
    pageId={page.pageId}
  >
    <h1 class="title">{page.pageTitle}</h1>
    <p class="block">Current parent is "{parent.pageTitle}"</p>

    <form x-data="{newParentId: ''}">
      <input type="hidden" name="newParentId" x-model="newParentId" />
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

      <ul x-on:click="newParentId = $event.target.dataset.pageId;"></ul>
    </form>
  </Layout>
);
