import { Feedback as FeedbackType } from '../../types';
import { isFeedbackError } from '../../lib/feedbacks';
import clsx from 'clsx';

interface FeedbackProps {
  feedback: FeedbackType;
}

export const Feedback = ({ feedback }: FeedbackProps) => (
  <div
    class={clsx(
      'notification',
      'is-light',
      isFeedbackError(feedback) ? 'is-danger' : 'is-success'
    )}
    role={isFeedbackError(feedback) ? 'alert' : 'status'}
  >
    {feedback.message}
  </div>
);
