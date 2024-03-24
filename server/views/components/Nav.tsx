import { NavItem } from '../../types';
import styles from './Nav.module.css';

interface NavProps {
  tree: NavItem;
  currentPageId: string;
}

let pageId = '';

export const Nav = ({ tree, currentPageId }: NavProps) => {
  pageId = currentPageId;
  return (
    <nav className={styles.Nav}>
      <a
        href={tree.link}
        className={tree.pageId === pageId ? styles.active : ''}
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
      <li key={item.link}>
        <a
          className={item.pageId === pageId ? styles.active : ''}
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
