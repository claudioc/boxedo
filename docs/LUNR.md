## Issues with Lunr

The problem with Lunr is that we cannot add/remove indexes from the the index, which needs to be rebuilt.

We can only debounce it, just in case.

```ts
private updateDebounceTimeout: NodeJS.Timeout | null = null;

public async scheduleIndexUpdate() {
  if (this.updateDebounceTimeout) {
    clearTimeout(this.updateDebounceTimeout);
  }

  this.updateDebounceTimeout = setTimeout(() => {
    this.buildIndex();
    this.updateDebounceTimeout = null;
  }, 1000); // Wait 1 second after last update
}
```

Consider using [minisearch](https://github.com/lucaong/minisearch) for the search, so we can index the whole document set at the beginning and then move/update/remove docs as we go. Minisearch doesn't provide offsets, so marking the matching terms [will be more complicated](https://github.com/lucaong/minisearch/issues/37). But maybe they don't have stemming for the languages?
