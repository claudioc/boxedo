import styles from './Menu.module.css';

interface MenuProps {
  pageId?: string;
}

export const Menu = ({ pageId }: MenuProps) => {
  if (!pageId) {
    return null;
  }

  return (
    <div className={styles.Menu}>
      <menu>
        <MenuItem href={`/edit/${pageId}`}>Edit this page</MenuItem>
        <MenuItem href={`/create/${pageId}`}>Create a subpage</MenuItem>
      </menu>
    </div>
  );
};

const MenuItem = ({ href, children }: { href: string; children: string }) => (
  <li>
    <a class="button secondary outline" href={href}>
      {children}
    </a>
  </li>
);
