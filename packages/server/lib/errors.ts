import type { Feedback } from 'boxedo-core/types';

export class ErrorWithFeedback extends Error {
  constructor(public feedback: Feedback) {
    super(feedback.message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorWithFeedback);
    }

    this.feedback = feedback;
    this.name = 'ErrorWithFeedback';
  }
}
