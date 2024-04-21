import { Feedback, Feedbacks } from '~/views/components/Feedback';

export const ValidationErrors = () => (
  <div class="block">
    <div x-show="error && error.pageTitle">
      <Feedback feedback={Feedbacks.E_EMPTY_TITLE} />
    </div>

    <div x-show="error && error.pageContent">
      <Feedback feedback={Feedbacks.E_EMPTY_CONTENT} />
    </div>
  </div>
);
