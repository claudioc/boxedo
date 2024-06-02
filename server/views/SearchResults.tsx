import { Layout } from './Layout';
import { PageModel } from '~/types';
import { slugUrl } from '~/lib/helpers';

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
            <li key={result._id} class="content">
              <a href={slugUrl(result.pageSlug)}>{result.pageTitle}</a>
              {result.pageContent && (
                <blockquote class="ml-4">
                  <HighlightPhrase text={result.pageContent} phrase={query} />
                </blockquote>
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

interface HighlightPhraseProps {
  text: string;
  phrase: string;
}

const HighlightPhrase = ({ text, phrase }: HighlightPhraseProps) => {
  const parts = text.split(new RegExp(`(${phrase})`, 'gi'));

  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === phrase.toLowerCase() ? (
          <strong key={index}>{part}</strong>
        ) : (
          part
        )
      )}
    </span>
  );
};
