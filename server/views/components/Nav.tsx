import { NavItem } from '~/types';
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
    <aside
      className={clsx(styles.nav, 'menu', 'p-4', 'has-background-info-dark')}
    >
      <a
        href={tree.link}
        className={
          tree.pageId === pageId
            ? clsx(styles.active, 'is-active')
            : 'menu-label'
        }
      >
        {tree.title}
      </a>
      <NavTree items={tree.children} />
    </aside>
  );
};

interface NavTreeProps {
  items: NavItem[];
}

const NavTree = ({ items }: NavTreeProps) => (
  <ul class={clsx('menu-list')}>
    {items.map((item: NavItem) => (
      <li key={item.link}>
        <a
          className={
            item.pageId === pageId
              ? clsx(styles.active, 'is-active')
              : 'has-background-info-dark'
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
