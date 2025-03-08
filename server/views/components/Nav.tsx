import type { NavItem } from '~/../types';
import { DocumentIcon } from '~/views/icons/DocumentIcon';
import { SortableEnabler } from './SortableEnabler';

interface NavProps {
  forest: NavItem[];
  currentPageId: string;
  // In certain cases we don't want people to use the navigation
  // i.e. during page creation or editing
  disabled: boolean;
}

let pageId = '';

export const Nav = ({ forest, currentPageId, disabled }: NavProps) => {
  pageId = currentPageId;

  return (
    <>
      <menu
        class={[
          'menu p-0 -ml-3',
          disabled ? 'pointer-events-none opacity-50' : '',
        ]}
      >
        {forest.length ? <NavTree items={forest} /> : null}
      </menu>
      {forest.length ? <SortableEnabler /> : null}
    </>
  );
};

interface NavTreeProps {
  items: NavItem[];
}

const NavTree = ({ items }: NavTreeProps) => (
  <ul data-ref="main-navigation-tree">
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

const NavItemComponent = ({ item }: NavItemProps) => (
  <a
    href={item.link}
    hx-get={item.link}
    hx-target="[data-ref='main-page-body']"
    hx-push-url={item.link}
    hx-ext="activate"
    data-activate=".menu/j-active"
    data-context="viewing page"
    data-page-id={item.pageId}
    data-position={item.position}
    title={item.title}
    class={['items-start', item.pageId === pageId ? 'j-active' : '']}
  >
    <DocumentIcon isSortableHandle />
    {item.title}
  </a>
);
