import { PageModel } from '../../types';

interface DebugInfoProps {
  page?: PageModel;
}

export const DebugInfo = ({ page }: DebugInfoProps) => (
  <details>
    <summary>Debug</summary>
    <div class="block">
      <input type="text" name="pageTitle" value={page?.pageTitle} />
    </div>
    <textarea name="pageContent">{page?.pageContent}</textarea>
  </details>
);
