import { PageModel } from '../../types';

interface DebugInfoProps {
  page?: PageModel;
}

export const DebugInfo = ({ page }: DebugInfoProps) => (
  <details>
    <summary>Debug</summary>
    <input type="text" name="pageTitle" value={page?.pageTitle} />
    <textarea name="pageContent">{page?.pageContent}</textarea>
  </details>
);
