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
                  <a
                    href={slugUrl(
                      result.pageSlug,
                      ctx.app.config.JNGL_BASE_EXTERNAL_URL
                    )}
                  >
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
