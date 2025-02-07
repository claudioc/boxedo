import { Layout } from './Layout';
import type { PageModel, WithCtx } from '~/../types';
import { slugUrl } from '~/lib/helpers';
import styles from './SearchResults.module.css';
import { DocumentIcon } from './icons/DocumentIcon';

interface SearchResultsProps extends WithCtx {
  query: string;
  results?: PageModel[];
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
              <div class={styles.item}>
                <DocumentIcon />
                <a href={slugUrl(result.pageSlug)}>{result.pageTitle}</a>
              </div>
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
      {parts.map((part) =>
        part.toLowerCase() === phrase.toLowerCase() ? (
          <strong>{part}</strong>
        ) : (
          part
        )
      )}
    </span>
  );
};
