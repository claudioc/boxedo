import { Layout } from './Layout';
import { PageProps } from '../types';

interface IndexPageProps extends PageProps {
  isEmpty: boolean;
}

export const IndexPage = ({ title, content, isEmpty }: IndexPageProps) => (
  <Layout title={title} isIndex>
    <ul>
      <li>
        {!isEmpty && <a href="/edit/index">Edit this page</a>}
        {isEmpty && <a href="/create-index">Create this page</a>}
      </li>
      <li>
        <a href="/create">Create subpage</a>
      </li>
    </ul>
    <div>
      <h1>{title}</h1>
      <div dangerouslySetInnerHTML={{ __html: content || '' }}></div>
    </div>
  </Layout>
);
