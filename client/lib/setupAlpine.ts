import Alpine from 'alpinejs';

export interface AppStore {
  error: Record<string, boolean>;
  info: boolean;
  errorOn(key: string): boolean;
  some(): boolean;
  none(): void;
}

Alpine.store('has', {
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

Alpine.start();

const store = Alpine.store('has') as AppStore;
export { store };
