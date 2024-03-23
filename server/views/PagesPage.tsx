import { Layout } from './Layout';
import { PageWithoutContentModel } from '../types';

interface PagesPageProps {
  pages: PageWithoutContentModel[];
}

export const PagesPage = ({ pages }: PagesPageProps) => (
  <Layout title="All pages">
    <h1>All pages</h1>
    <ul>
      {pages.map((page) => (
        <li key={page.pageId}>
          <a href={`/page/${page.pageId}`}>{page.pageTitle}</a>
        </li>
      ))}
    </ul>
  </Layout>
);
