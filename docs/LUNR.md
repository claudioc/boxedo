## Issues with Lunr

The problem with Lunr is that we cannot add/remove indexes from the the index, which needs to be rebuilt. There is also a pretty low limit in number of documents that can be indexed. The server explodes when we bulk load something around 2000 documents. Now I have fixed a limit to just 200.

Consider using [minisearch](https://github.com/lucaong/minisearch) for the search, so we can index the whole document set at the beginning and then move/update/remove docs as we go. Minisearch doesn't provide offsets, so marking the matching terms [will be more complicated](https://github.com/lucaong/minisearch/issues/37). But maybe they don't have stemming for the languages?
