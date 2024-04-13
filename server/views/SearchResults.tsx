import { Layout } from './Layout';
import { PageModel } from '~/types';
import { pageUrl } from '~/lib/helpers';

interface SearchResultsProps {
  query: string;
  results?: PageModel[];
}

export const SearchResults = ({ query, results }: SearchResultsProps) => {
  const hasResults = results && results.length > 0;

  return (
    <Layout title="Search Results">
      <h1 class="title">Search Results</h1>
      <h2 class="subtitle">Results for query: {query}</h2>
      {hasResults ? (
        <ul>
          {results.map((result) => (
            <li key={result.pageId} class="content">
              <a href={pageUrl(result.pageSlug)}>{result.pageTitle}</a>
              {result.pageContent && (
                <blockquote class="ml-4">{result.pageContent}</blockquote>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No results found.</p>
      )}
    </Layout>
  );
};
