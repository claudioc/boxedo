import { Layout } from './Layout';
import { PageProps } from '../types';
import { INDEX_PAGE_ID } from '../constants';

interface IndexPageProps extends PageProps {
  isEmpty: boolean;
}

export const IndexPage = ({ title, content, isEmpty }: IndexPageProps) => (
  <Layout title={title} isIndex>
    <ul>
      <li>
        {!isEmpty && <a href={`/edit/${INDEX_PAGE_ID}`}>Edit this page</a>}
        {isEmpty && <a href="/create-index">Creates this page</a>}
      </li>
      <li>
        <a href={`/create/${INDEX_PAGE_ID}`}>Create subpage</a>
      </li>
      <li>
        <a href="/pages">List all pages</a>
      </li>
    </ul>
    <div>
      <h1>{title}</h1>
      <div dangerouslySetInnerHTML={{ __html: content || '' }}></div>
    </div>
  </Layout>
);
