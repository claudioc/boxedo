import { Layout } from './Layout';
import { PageProps } from '../types';

export const IndexPage = ({ title }: PageProps) => (
  <Layout title={title} isIndex>
    <ul>
      <li>
        <a href="/edit/index">Edit this page</a>
      </li>
      <li>
        <a href="/create">Create subpage</a>
      </li>
    </ul>
  </Layout>
);
