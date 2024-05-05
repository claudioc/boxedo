import { PageModel } from '~/types';

interface PageBodyProps {
  page: PageModel;
}

export const PageBody = ({ page }: PageBodyProps) => (
  <>
    <h1 class="title">{page.pageTitle}</h1>
    <div
      class="content"
      dangerouslySetInnerHTML={{ __html: page.pageContent || '' }}
    ></div>
  </>
);
