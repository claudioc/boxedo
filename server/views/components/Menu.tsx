import styles from './Menu.module.css';

interface MenuProps {
  pageId?: string;
}

export const Menu = ({ pageId }: MenuProps) => (
  <div className={styles.Menu}>
    <menu>
      <li>
        <MenuItem href={`/edit/${pageId}`}>Edit this page</MenuItem>
      </li>
      <li>
        <MenuItem href={`/create/${pageId}`}>Create a subpage</MenuItem>
      </li>
    </menu>
  </div>
);

const MenuItem = ({ href, children }: { href: string; children: string }) => (
  <li>
    <a class="button outline" href={href}>
      {children}
    </a>
  </li>
);
