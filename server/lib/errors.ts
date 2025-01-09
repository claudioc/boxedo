import type { Feedback } from '~/../types';

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
