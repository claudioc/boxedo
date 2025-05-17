import type { WithCtx } from 'boxedo-core/types';
import { mapTextSize } from '~/lib/helpers';

interface PageBodyProps extends WithCtx {
  title: string;
  body: string;
}

export const PageBody = ({ ctx, title, body }: PageBodyProps) => {
  const textSizeClass = mapTextSize(ctx.prefs.textSize);

  return (
    <div class="prose">
      <h1>{title}</h1>
      <div class={textSizeClass}>{`${body || ''}`}</div>
    </div>
  );
};
