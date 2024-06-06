import { Layout } from './Layout';
import type { PageModel } from '~/types';
import { slugUrl } from '~/lib/helpers';
import { useApp } from '~/lib/context/App';

interface SearchResultsProps {
  query: string;
  results?: PageModel[];
}

export const SearchResults = ({ query, results }: SearchResultsProps) => {
  const { i18n } = useApp();
  const hasResults = results && results.length > 0;

  return (
    <Layout title="Search Results">
      <h1 class="title">{i18n.t('SearchResults.title')}</h1>
      <h2 class="subtitle">
        {i18n.t('SearchResults.resultsForQuery')}: {query}
      </h2>
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
        <p>{i18n.t('SearchResults.noResults')}</p>
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
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          <strong key={index}>{part}</strong>
        ) : (
          part
        )
      )}
    </span>
  );
};
