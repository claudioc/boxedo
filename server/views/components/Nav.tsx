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
    <aside class={clsx(styles.nav, 'menu', 'p-4', 'has-background-info-dark')}>
      <div class={styles.tree}>
        <a
          href={tree.link}
          hx-get={tree.link}
          hx-target=".column.right"
          hx-push-url="true"
          hx-ext="activate"
          data-activate="aside/is-active"
          class={tree.pageId === pageId ? 'is-active menu-label' : 'menu-label'}
        >
          {tree.title}
        </a>
        <NavTree items={tree.children} />
      </div>
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
          href={item.link}
          hx-get={item.link}
          hx-target=".column.right"
          hx-push-url="true"
          hx-ext="activate"
          data-activate="aside/is-active"
          class={item.pageId === pageId ? 'is-active' : ''}
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
