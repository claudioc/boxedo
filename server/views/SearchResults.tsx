import type { SearchContentSnippet, SearchResult, WithCtx } from '~/../types';
import { slugUrl } from '~/lib/helpers';
import { Layout } from './Layout';
import styles from './SearchResults.module.css';
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
              <div class="block">
                <div class={styles.item}>
                  <DocumentIcon />
                  <a href={slugUrl(result.pageSlug)}>{result.title}</a>
                </div>
                <div class="level level-right is-size-7">
                  {i18n.t('SearchResults.matches')}
                  {result.terms.map((term) => (
                    <span class="tag is-info">{term}</span>
                  ))}
                </div>
              </div>
              {result.snippets.map((snippet) => (
                <blockquote class="ml-4">
                  <HighlightedSnippet snippet={snippet} />
                </blockquote>
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <p>{i18n.t('SearchResults.noResults')}</p>
      )}
    </Layout>
  );
};

const HighlightedSnippet = ({ snippet }: { snippet: SearchContentSnippet }) => {
  const { text, positions } = snippet;
  const parts: JSX.Element[] = [];
  let lastIndex = 0;

  positions.forEach(([start, length], _index) => {
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    parts.push(<strong>{text.slice(start, start + length)}</strong>);

    lastIndex = start + length;
  });

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span>{parts}</span>;
};
