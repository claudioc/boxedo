import { isIndexPage, isIndexPlaceholderPage } from '~/lib/helpers';
import styles from './Menu.module.css';
import clsx from 'clsx';
import { PageModel } from '~/types';

interface PageMenuProps {
  page?: PageModel;
}

export const PageMenu = ({ page }: PageMenuProps) => {
  if (!page) {
    return null;
  }

  return (
    <div className={clsx(styles.Menu)}>
      <div class="dropdown is-right is-hoverable">
        <div class="dropdown-trigger">
          <button
            class="button"
            aria-haspopup="true"
            aria-controls="dropdown-menu"
          >
            <span>Actions …</span>
          </button>
        </div>
        <div class="dropdown-menu" id="dropdown-menu" role="menu">
          <div class="dropdown-content">
            <a href={`/edit/${page.pageId}`} class="dropdown-item">
              Edit this page
            </a>
            {!isIndexPlaceholderPage(page) && (
              <a href={`/create/${page.pageId}`} class="dropdown-item">
                Create a subpage
              </a>
            )}
            {!isIndexPage(page) && (
              <a href={`/move/${page.pageId}`} class="dropdown-item">
                Move this page
              </a>
            )}
            <a href={`/history/${page.pageId}`} class="dropdown-item">
              Page history
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
