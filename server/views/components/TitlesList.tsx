import type Polyglot from 'node-polyglot';
import type { SearchTitlesResult } from '~/../types';
import { DocumentIcon } from '../icons/DocumentIcon';

interface TitlesListProps {
  titles: SearchTitlesResult[];
  // We receive the i18n object because we can't use the useApp hook here
  i18n: Polyglot;
}

export const TitlesList = ({ titles, i18n }: TitlesListProps) => {
  return (
    <>
      {titles.length > 0 && (
        <menu class="menu p-0 -ml-3">
          <ul class="p-0 m-2">
            {titles.map((title) => (
              <li>
                <div>
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
        </menu>
      )}

      {titles.length === 0 && (
        <div>
          <em>{i18n.t('MovePage.noResults')}</em>
        </div>
      )}
    </>
  );
};
