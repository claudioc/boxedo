import Alpine from 'alpinejs';

interface PageStateStore {
  pageId: string;
  error: Record<string, boolean>;
  info: boolean;
  hasErrorOn(key: string): boolean;
  hasFeedback(): boolean;
  reset(): void;
}

interface FormStateStore {
  submitting: boolean;
}

interface EditorStateStore {
  isImage(): boolean;
}

Alpine.store('pageState', {
  pageId: '',
  error: {},
  info: true,
  hasErrorOn(key: string) {
    return !!this.error[key];
  },
  hasFeedback() {
    return this.info || (this.error && Object.keys(this.error).length > 0);
  },
  reset() {
    this.error = {};
    this.info = false;
  },
} as PageStateStore);

Alpine.store('editorState', {
  isImage() {
    return !!window.App.getEditor()?.isActive('image');
  },
} as EditorStateStore);

Alpine.store('formState', {
  submitting: false,
} as FormStateStore);

Alpine.start();

const pageState = Alpine.store('pageState') as PageStateStore;
const formState = Alpine.store('formState') as FormStateStore;
export { formState, pageState };
