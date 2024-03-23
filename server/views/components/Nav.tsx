import { NavItem } from '../../types';
import styles from './Nav.module.css';

interface NavProps {
  tree: NavItem;
}

export const Nav = ({ tree }: NavProps) => {
  return (
    <nav className={styles.Nav}>
      <ul>
        <li>
          <a href={tree.link}>{tree.title}</a>
          <NavItem items={tree.children} />
        </li>
      </ul>
    </nav>
  );
};

const NavItem = ({ items }: { items: NavItem[] }) => (
  <ul>
    {items.map((item: NavItem) => (
      <li key={item.link}>
        <a href={item.link}>{item.title}</a>
        {item.children && item.children.length ? (
          <NavItem items={item.children} />
        ) : null}
      </li>
    ))}
  </ul>
);
