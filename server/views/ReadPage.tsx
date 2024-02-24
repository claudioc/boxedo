import { Layout } from './Layout';
import { PageProps } from '../types';

export const ReadPage = ({ title, content }: PageProps) => (
  <Layout title={title} isIndex>
    <div>
      <h1>{title}</h1>
      <div dangerouslySetInnerHTML={{ __html: content || '' }}></div>
    </div>
  </Layout>
);
