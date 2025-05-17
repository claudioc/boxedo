import type { Feedback as FeedbackType, WithCtx } from 'boxedo-core/types';
import {
  Feedbacks,
  getFeedbackKeyByCode,
  isFeedbackError,
} from '~/lib/feedbacks';

interface FeedbackProps extends WithCtx {
  feedback?: FeedbackType;
}

export const Feedback = ({ ctx, feedback }: FeedbackProps) => {
  const { i18n } = ctx.app;

  if (!feedback) {
    return null;
  }

  /**
   * The info state is set and handled only here.
   * The error state is set and handled in the parent component.
   * It's important that we first test "info" because error may be undefined.
   * Definitely a bit messy, but it works.
   */
  return (
    <div
      x-data="{ isOpen: true }"
      class="fixed bottom-8 left-1/2 -translate-x-1/2 w-1/2 max-w-lg z-50"
    >
      <div
        x-show="isOpen"
        x-on:click="isOpen=false"
        class={[
          'alert',
          isFeedbackError(feedback) ? 'alert-error' : 'alert-success',
        ]}
        role={isFeedbackError(feedback) ? 'alert' : 'status'}
      >
        {i18n.t(getFeedbackKeyByCode(feedback.code))}
      </div>
    </div>
  );
};

export { Feedbacks };
