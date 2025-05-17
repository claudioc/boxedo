import type { WithCtx } from 'boxedo-core/types';
import { SearchIcon } from '~/views/icons/SearchIcon';

export const Search = ({ ctx }: WithCtx) => {
  const { i18n, urlService } = ctx.app;

  return (
    <form action={urlService.url('/search')} method="get">
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
