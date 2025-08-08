import type { WithCtx } from 'boxedo-core/types';
import { Feedback, Feedbacks } from '~/views/components/Feedback';

export const ValidationErrors = ({ ctx }: WithCtx) => (
  <>
    <div x-show="$store.pageState.hasErrorOn('pageTitle')">
      <Feedback ctx={ctx} feedback={Feedbacks.E_EMPTY_TITLE} />
    </div>

    <div x-show="$store.pageState.hasErrorOn('pageContent')">
      <Feedback ctx={ctx} feedback={Feedbacks.E_EMPTY_CONTENT} />
    </div>

    <div x-show="$store.pageState.hasErrorOn('uploadUrl') && $store.pageState.hasErrorOn('uploadFile')">
      <Feedback ctx={ctx} feedback={Feedbacks.E_UPLOAD_DATA_MISSING} />
    </div>

    <div x-show="$store.pageState.hasErrorOn('uploadUrl') && !$store.pageState.hasErrorOn('uploadFile')">
      <Feedback ctx={ctx} feedback={Feedbacks.E_UPLOAD_URL_PROBLEMATIC} />
    </div>
  </>
);
