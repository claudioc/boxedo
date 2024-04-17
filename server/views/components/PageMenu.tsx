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
    <div className={clsx(styles.Menu, 'level')}>
      <menu className="level-right level-item m-0">
        <MenuItem href={`/edit/${page.pageId}`}>Edit this page</MenuItem>
        {!isIndexPage(page) && (
          <MenuItem href={`/move/${page.pageId}`}>Move this page</MenuItem>
        )}
        {!isIndexPlaceholderPage(page) && (
          <MenuItem href={`/create/${page.pageId}`}>Create a subpage</MenuItem>
        )}
      </menu>
    </div>
  );
};

const MenuItem = ({ href, children }: { href: string; children: string }) => (
  <li className="level-item">
    <a class="button" href={href}>
      {children}
    </a>
  </li>
);
