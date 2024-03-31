import { Layout } from './Layout';
import { PageModel } from '../types';

interface SearchResultsProps {
  query: string;
  results?: PageModel[];
}

export const SearchResults = ({ query, results }: SearchResultsProps) => {
  const hasResults = results && results.length > 0;

  return (
    <Layout title="Search Results">
      <h1>Search Results</h1>
      <p>Results for query: {query}</p>
      {hasResults ? (
        <ul>
          {results.map((result) => (
            <li key={result.pageId}>
              <a href={`/page/${result.pageId}`}>{result.pageTitle}</a>
              <p>
                <blockquote>{result.pageContent}</blockquote>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No results found.</p>
      )}
    </Layout>
  );
};
