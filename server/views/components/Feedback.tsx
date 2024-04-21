import { Feedback as FeedbackType } from '~/types';
import { Feedbacks, isFeedbackError } from '~/lib/feedbacks';
import clsx from 'clsx';
import styles from './Feedback.module.css';

interface FeedbackProps {
  feedback?: FeedbackType;
}

export const Feedback = ({ feedback }: FeedbackProps) => {
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
      x-data="{ info: true }"
      x-show="info || error"
      class={clsx(
        styles.Feedback,
        'block',
        'notification',
        'is-light',
        isFeedbackError(feedback) ? 'is-danger' : 'is-success'
      )}
      role={isFeedbackError(feedback) ? 'alert' : 'status'}
    >
      <button class="delete" x-on:click="info = false; error = false"></button>
      {feedback.message}
    </div>
  );
};

export { Feedbacks };
