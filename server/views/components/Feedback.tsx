import { Feedback as FeedbackType } from '~/types';
import { Feedbacks, isFeedbackError } from '~/lib/feedbacks';
import clsx from 'clsx';

interface FeedbackProps {
  feedback: FeedbackType;
}

export const Feedback = ({ feedback }: FeedbackProps) => (
  <div
    class={clsx(
      'block',
      'notification',
      'is-light',
      isFeedbackError(feedback) ? 'is-danger' : 'is-success'
    )}
    role={isFeedbackError(feedback) ? 'alert' : 'status'}
  >
    {feedback.message}
  </div>
);

export { Feedbacks };
