import type { SearchResult, WithCtx } from 'boxedo-core/types';
import { Layout } from './Layout';
import { DocumentIcon } from './icons/DocumentIcon';

interface SearchResultsProps extends WithCtx {
  query: string;
  results?: SearchResult[];
}

export const SearchResults = ({ ctx, query, results }: SearchResultsProps) => {
  const { i18n, urlService } = ctx.app;
  const hasResults = results && results.length > 0;

  return (
    // We set the landing page so
    <Layout ctx={ctx} title="Search Results">
      <div class="prose">
        <h2>{i18n.t('SearchResults.title')}</h2>
        <p>
          {i18n.t('SearchResults.resultsForQuery')}: <em>{query}</em>
        </p>
        {hasResults ? (
          <ul class="list-none p-0">
            {results.map((result) => (
              <li>
                <div class="flex gap-2 items-center">
                  <DocumentIcon />
                  <a href={urlService.slugUrl(result.pageSlug)}>
                    {result.title}
                  </a>
                </div>
                <blockquote class="mt-2 ml-6">{result.snippets}</blockquote>
              </li>
            ))}
          </ul>
        ) : (
          <p>{i18n.t('SearchResults.noResults')}</p>
        )}
      </div>
    </Layout>
  );
};
