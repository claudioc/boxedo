import { Feedback, Feedbacks } from '~/views/components/Feedback';

export const ValidationErrors = () => (
  <div class="block">
    <div x-show="$store.has.errorOn('pageTitle')">
      <Feedback feedback={Feedbacks.E_EMPTY_TITLE} />
    </div>

    <div x-show="$store.has.errorOn('pageContent')">
      <Feedback feedback={Feedbacks.E_EMPTY_CONTENT} />
    </div>
  </div>
);
