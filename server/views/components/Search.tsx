import { useApp } from '~/lib/context/App';
import { SearchIcon } from '../icons/SearchIcon';

export const Search = () => {
  const { i18n } = useApp();

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
