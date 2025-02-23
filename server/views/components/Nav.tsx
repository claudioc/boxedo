import type { Context, NavItem } from '~/../types';
import { DocumentIcon } from '~/views/icons/DocumentIcon';
import styles from './Nav.module.css';
import { SortableEnabler } from './SortableEnabler';

interface NavProps {
  forest: NavItem[];
  currentPageId: string;
}

let pageId = '';

export const Nav = ({ forest, currentPageId }: NavProps) => {
  pageId = currentPageId;

  return (
    <>
      <menu class={styles.nav} id="main-navigation">
        {forest.length ? <NavTree items={forest} /> : null}
      </menu>
      <SortableEnabler />
    </>
  );
};

interface NavTreeProps {
  items: NavItem[];
}

const NavTree = ({ items }: NavTreeProps) => (
  <ul>
    {items.map((item: NavItem) => (
      <li>
        <NavItemComponent item={item} />
        {item.children?.length ? <NavTree items={item.children} /> : null}
      </li>
    ))}
  </ul>
);

interface NavItemProps {
  item: NavItem;
}

const NavItemComponent = ({ item }: NavItemProps) => {
  const context: Context = 'viewing page';

  return (
    <div class={styles.item}>
      <DocumentIcon isSortableHandle />
      <a
        href={item.link}
        hx-get={item.link}
        hx-target="#main-page-body"
        hx-push-url={item.link}
        hx-ext="activate"
        data-activate="aside/is-active"
        data-context={context}
        data-page-id={item.pageId}
        data-position={item.position}
        class={item.pageId === pageId ? 'is-active' : ''}
        title={item.title}
      >
        {item.title}
      </a>
    </div>
  );
};
