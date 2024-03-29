import { Feedback as FeedbackType } from '../../types';
import { isFeedbackError } from '../../lib/feedbacks';

interface FeedbackProps {
  feedback: FeedbackType;
}

export const Feedback = ({ feedback }: FeedbackProps) => (
  <div class="row">
    <div class="col" role="alert">
      <div
        class={isFeedbackError(feedback) ? 'card bd-error' : 'card bd-success'}
        role="alert"
      >
        {feedback.message}
      </div>
    </div>
  </div>
);
