import { useApp } from '~/lib/context/App';

export const Search = () => {
  const { i18n } = useApp();

  return (
    <form action="/search" method="get">
      <div class="field">
        <div class="control">
          <input
            type="search"
            class="input"
            name="q"
            placeholder={`${i18n.t('Search.search')}…`}
          />
        </div>
      </div>
    </form>
  );
};
