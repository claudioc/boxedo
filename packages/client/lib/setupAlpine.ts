import Alpine from 'alpinejs';

interface AppStore {
  pageId: string;
  error: Record<string, boolean>;
  info: boolean;
  errorOn(key: string): boolean;
  some(): boolean;
  none(): void;
}

interface FormStore {
  submitting: boolean;
}

Alpine.store('has', {
  pageId: '',
  error: {},
  info: true,
  errorOn(key: string) {
    return !!this.error[key];
  },
  some() {
    return this.info || (this.error && Object.keys(this.error).length > 0);
  },
  none() {
    this.error = {};
    this.info = false;
  },
} as AppStore);

Alpine.store('editorState', {
  isImage() {
    return !!window.App.getEditor()?.isActive('image');
  },
});

Alpine.store('form', {
  submitting: false,
} as FormStore);

Alpine.start();

const store = Alpine.store('has') as AppStore;
const storeForm = Alpine.store('form') as FormStore;
export { store, storeForm };
