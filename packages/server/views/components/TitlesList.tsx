import type { SearchTitlesResult, WithCtx } from 'boxedo-core/types';
import { DocumentIcon } from '../icons/DocumentIcon';

interface TitlesListProps extends WithCtx {
  titles: SearchTitlesResult[];
}

export const TitlesList = ({ ctx, titles }: TitlesListProps) => {
  const { i18n } = ctx.app;

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
