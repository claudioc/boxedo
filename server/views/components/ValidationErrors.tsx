import { Feedback, Feedbacks } from '~/views/components/Feedback';
import type { WithApp } from '~/../types';

export const ValidationErrors = ({ app }: WithApp) => (
  <>
    <div x-show="$store.has.errorOn('pageTitle')">
      <Feedback app={app} feedback={Feedbacks.E_EMPTY_TITLE} />
    </div>

    <div x-show="$store.has.errorOn('pageContent')">
      <Feedback app={app} feedback={Feedbacks.E_EMPTY_CONTENT} />
    </div>

    <div x-show="$store.has.errorOn('uploadUrl') && $store.has.errorOn('uploadFile')">
      <Feedback app={app} feedback={Feedbacks.E_UPLOAD_DATA_MISSING} />
    </div>

    <div x-show="$store.has.errorOn('uploadUrl') && !$store.has.errorOn('uploadFile')">
      <Feedback app={app} feedback={Feedbacks.E_UPLOAD_URL_PROBLEMATIC} />
    </div>
  </>
);
