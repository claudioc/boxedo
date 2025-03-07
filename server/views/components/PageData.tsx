import type { PageModel } from '~/../types';

interface DebugInfoProps {
  page?: PageModel;
  debug: boolean;
}

export const PageData = ({ page, debug }: DebugInfoProps) => {
  if (debug) {
    return (
      <details>
        <summary>Debug</summary>
        <div class="mb-5">
          <input
            class="input"
            type="text"
            name="pageTitle"
            value={page?.pageTitle}
          />
        </div>
        <textarea class="textarea" name="pageContent">
          {page?.pageContent}
        </textarea>
      </details>
    );
  }

  return (
    <div class="is-hidden">
      <input type="text" name="pageTitle" value={page?.pageTitle} />
      <textarea name="pageContent">{page?.pageContent}</textarea>
    </div>
  );
};
