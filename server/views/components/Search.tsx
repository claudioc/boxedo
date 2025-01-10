import { SearchIcon } from '~/views/icons/SearchIcon';
import type { WithApp } from '~/../types';

export const Search = ({ app }: WithApp) => {
  const { i18n } = app;

  return (
    <form action="/search" method="get">
      <div class="field">
        <div class="control has-icons-left">
          <input
            type="search"
            class="input is-small"
            name="q"
            placeholder={`${i18n.t('Search.search')}…`}
          />
          <span class="icon is-small is-left">
            <SearchIcon />
          </span>
        </div>
      </div>
    </form>
  );
};
