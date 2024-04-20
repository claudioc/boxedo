import { Feedback as FeedbackType } from '~/types';
import { Feedbacks, isFeedbackError } from '~/lib/feedbacks';
import clsx from 'clsx';
import styles from './Feedback.module.css';

interface FeedbackProps {
  feedback: FeedbackType;
}

export const Feedback = ({ feedback }: FeedbackProps) => (
  <div
    x-data
    x-ref="feedback"
    class={clsx(
      styles.Feedback,
      'block',
      'notification',
      'is-light',
      isFeedbackError(feedback) ? 'is-danger' : 'is-success'
    )}
    role={isFeedbackError(feedback) ? 'alert' : 'status'}
  >
    <button class="delete" x-on:click="$refs.feedback.remove()"></button>
    {feedback.message}
  </div>
);

export { Feedbacks };
