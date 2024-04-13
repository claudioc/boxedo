import { Feedback, Feedbacks } from '~/views/components/Feedback';

export const ValidationErrors = () => (
  <div>
    <div x-show="error && error.pageTitle" class="block">
      <Feedback feedback={Feedbacks.E_EMPTY_TITLE} />
    </div>

    <div x-show="error && error.pageContent" class="block">
      <Feedback feedback={Feedbacks.E_EMPTY_CONTENT} />
    </div>
  </div>
);
