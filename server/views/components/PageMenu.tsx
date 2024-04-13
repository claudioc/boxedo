import styles from './Menu.module.css';
import clsx from 'clsx';

interface PageMenuProps {
  pageId?: string;
}

export const PageMenu = ({ pageId }: PageMenuProps) => {
  if (!pageId) {
    return null;
  }

  return (
    <div className={clsx(styles.Menu, 'level')}>
      <menu className="level-right level-item m-0">
        <MenuItem href={`/edit/${pageId}`}>Edit this page</MenuItem>
        <MenuItem href={`/move/${pageId}`}>Move this page</MenuItem>
        <MenuItem href={`/create/${pageId}`}>Create a subpage</MenuItem>
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
