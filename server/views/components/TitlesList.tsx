import type Polyglot from 'node-polyglot';
import type { PageTitle } from '~/../types';
import { DocumentIcon } from '../icons/DocumentIcon';
import styles from './TitlesList.module.css';

interface TitlesListProps {
  titles: PageTitle[];
  // We receive the i18n object because we can't use the useApp hook here
  i18n: Polyglot;
}

export const TitlesList = ({ titles, i18n }: TitlesListProps) => {
  return (
    <>
      {titles.length > 0 && (
        <ul>
          {titles.map((title) => (
            <li>
              <div class={styles.item}>
                <DocumentIcon />
                <a
                  href={`#${title.pageId}`}
                  data-page-id={title.pageId}
                  data-page-title={title.pageTitle}
                >
                  {title.pageTitle}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
      {titles.length === 0 && (
        <div class={styles.noResults}>
          <em>{i18n.t('MovePage.noResults')}</em>
        </div>
      )}
    </>
  );
};
