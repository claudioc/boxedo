import type { PageModel } from '~/types';

interface PageBodyProps {
  page: PageModel;
}

export const PageBody = ({ page }: PageBodyProps) => (
  <>
    <h1 class="title">{page.pageTitle}</h1>
    <div
      class="content"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
      dangerouslySetInnerHTML={{ __html: page.pageContent || '' }}
    />
  </>
);
