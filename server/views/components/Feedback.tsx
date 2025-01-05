import type { Feedback as FeedbackType } from '~/types';
import {
  Feedbacks,
  isFeedbackError,
  getFeedbackKeyByCode,
} from '~/lib/feedbacks';
import clsx from 'clsx';
import styles from './Feedback.module.css';
import { useApp } from '~/lib/context/App';

interface FeedbackProps {
  feedback?: FeedbackType;
}

export const Feedback = ({ feedback }: FeedbackProps) => {
  const { i18n } = useApp();

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
      class={clsx(
        styles.Feedback,
        'block',
        'notification',
        'is-light',
        'px-4',
        'py-3',
        isFeedbackError(feedback) ? 'is-danger' : 'is-success'
      )}
      role={isFeedbackError(feedback) ? 'alert' : 'status'}
    >
      <button type="button" class="delete" x-on:click="$store.has.none()" />
      {i18n.t(getFeedbackKeyByCode(feedback.code))}
    </div>
  );
};

export { Feedbacks };
