import type { SearchResult, WithCtx } from '~/../types';
import { slugUrl } from '~/lib/helpers';
import { Layout } from './Layout';
import { DocumentIcon } from './icons/DocumentIcon';

interface SearchResultsProps extends WithCtx {
  query: string;
  results?: SearchResult[];
}

export const SearchResults = ({ ctx, query, results }: SearchResultsProps) => {
  const { i18n } = ctx.app;
  const hasResults = results && results.length > 0;

  return (
    <Layout ctx={ctx} title="Search Results">
      <h1 class="title">{i18n.t('SearchResults.title')}</h1>
      <p class="is-size-4 block">
        {i18n.t('SearchResults.resultsForQuery')}: <em>{query}</em>
      </p>
      {hasResults ? (
        <ul>
          {results.map((result) => (
            <li class="content">
              <div class="mb-5">
                <div class="mb-5">
                  <DocumentIcon />
                  <a href={slugUrl(result.pageSlug)}>{result.title}</a>
                </div>
              </div>
              <blockquote class="ml-4">{result.snippets}</blockquote>
            </li>
          ))}
        </ul>
      ) : (
        <p>{i18n.t('SearchResults.noResults')}</p>
      )}
    </Layout>
  );
};
