import type { WithCtx } from '~/../types';
import { SearchIcon } from '~/views/icons/SearchIcon';

export const Search = ({ ctx }: WithCtx) => {
  const { i18n } = ctx.app;

  return (
    <form action="/search" method="get">
      <label class="input">
        <SearchIcon />
        <input
          type="search"
          name="q"
          class="grow input-sm"
          placeholder={`${i18n.t('Search.search')}…`}
        />
      </label>
    </form>
  );
};
