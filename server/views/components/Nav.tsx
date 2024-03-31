import { NavItem } from '../../types';
import clsx from 'clsx';
import styles from './Nav.module.css';

interface NavProps {
  tree: NavItem;
  currentPageId: string;
}

let pageId = '';

export const Nav = ({ tree, currentPageId }: NavProps) => {
  pageId = currentPageId;
  return (
    <nav className={clsx(styles.Nav, 'nav')}>
      <a
        href={tree.link}
        className={tree.pageId === pageId ? clsx(styles.active, 'active') : ''}
      >
        {tree.title}
      </a>
      <NavTree items={tree.children} />
    </nav>
  );
};

interface NavTreeProps {
  items: NavItem[];
}

const NavTree = ({ items }: NavTreeProps) => (
  <ul>
    {items.map((item: NavItem) => (
      <li
        key={item.link}
        class={item.pageId === pageId ? 'active' : 'text-dark'}
      >
        <a
          className={
            item.pageId === pageId ? clsx(styles.active, 'active') : ''
          }
          href={item.link}
        >
          {item.title}
        </a>
        {item.children && item.children.length ? (
          <NavTree items={item.children} />
        ) : null}
      </li>
    ))}
  </ul>
);
