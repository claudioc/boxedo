import { Document as DocumentIndex } from 'flexsearch';
// The import below should be useless but I can't find a way to
// tell flexsearch to use it automatically
// @ts-ignore
import * as flexsearchLangSettings from 'flexsearch/src/lang/en';
import type {
  PageModel,
  SearchHitPosition,
  SearchResult,
  SearchSnippet,
} from '~/../types';
import { MAX_INDEXABLE_DOCUMENTS, SEARCH_SNIPPET_LENGTH } from '~/constants';
import type { DbService } from './dbService';

// Pick<PageModel, 'pageTitle' | 'pageContent' | 'pageSlug'>;
// These keys are used all over the place and it's better
// if they are stored as constants
const SEARCH_FIELDS = {
  CONTENT: 'pageContent',
  TITLE: 'pageTitle',
} as const;

export class SearchService {
  private static instance: SearchService | null = null;
  private dbs: DbService;
  private idx: DocumentIndex<PageModel, string[]>;

  private indexBuilt: Promise<void>;
  private resolveIndexBuilt!: () => void;
  private isRebuilding = false;
  private pendingRebuild = false;

  private constructor(dbs: DbService) {
    this.dbs = dbs;

    this.idx = new DocumentIndex({
      charset: 'latin:default',
      filter: flexsearchLangSettings.filter,
      stemmer: flexsearchLangSettings.stemmer,
      matcher: flexsearchLangSettings.matcher,
      language: 'en',
      document: {
        id: '_id',
        index: [
          {
            field: SEARCH_FIELDS.TITLE,
            tokenize: 'strict',
            optimize: true,
            resolution: 5,
          },
          {
            field: SEARCH_FIELDS.CONTENT,
            tokenize: 'strict',
            optimize: true,
            resolution: 5,
          },
        ],
        store: ['pageSlug', 'pageTitle'], // Store minimal info to avoid fetching for common cases
      },
      cache: 100,
    });

    // Create a promise we can await to know when the index is built
    this.indexBuilt = new Promise((resolve) => {
      this.resolveIndexBuilt = resolve;
    });

    this.buildIndex();
  }

  public static async getInstance(dbs?: DbService): Promise<SearchService> {
    if (!SearchService.instance && !dbs) {
      throw new Error(
        'Cannot create an indexer instance without the database service'
      );
    }

    if (!SearchService.instance && dbs) {
      SearchService.instance = new SearchService(dbs);
      // Wait for the initial index to be built
      await SearchService.instance.indexBuilt;
      return SearchService.instance;
    }

    if (!SearchService.instance) {
      throw new Error('Unexpected missed searchService instance');
    }

    return SearchService.instance;
  }

  public async buildIndex() {
    try {
      const allDocs = (
        await this.dbs.db.find({
          selector: { type: 'page' },
          // On the development mac, the limit is around 2000 quite big docs (around 100MB)
          limit: MAX_INDEXABLE_DOCUMENTS,
        })
      ).docs as PageModel[];

      const totalSize = allDocs.reduce(
        (acc, doc) =>
          acc +
          (doc as PageModel).pageTitle.length +
          (doc as PageModel).pageContent.length,
        0
      );

      for (const doc of allDocs) {
        this.idx.add(doc);
      }

      console.log(
        `🔍 FlexSearch index built with ${allDocs.length} documents with a ${totalSize} overall size`
      );
      this.resolveIndexBuilt();
    } catch (err) {
      console.error('Failed to build index:', err);
      throw err;
    }
  }

  public async addDocument(doc: PageModel): Promise<void> {
    await this.indexBuilt;
    this.idx.add(doc);
  }

  public async removeDocument(id: string): Promise<void> {
    await this.indexBuilt;
    this.idx.remove(id);
  }

  public async updateDocument(doc: PageModel): Promise<void> {
    await this.indexBuilt;
    this.idx.update(doc);
  }

  public async rebuildIndex(): Promise<void> {
    if (this.isRebuilding) {
      // Mark that we need another rebuild after this one
      this.pendingRebuild = true;
      return;
    }

    try {
      this.isRebuilding = true;
      this.indexBuilt = new Promise((resolve) => {
        this.resolveIndexBuilt = resolve;
      });

      await this.buildIndex();

      // Check if another rebuild was requested while we were building
      if (this.pendingRebuild) {
        this.pendingRebuild = false;
        // Start another rebuild
        await this.rebuildIndex();
      }
    } finally {
      this.isRebuilding = false;
    }
  }

  private extractPositionsFromMatches(
    text: string,
    term: string
  ): SearchHitPosition[] {
    const positions: SearchHitPosition[] = [];
    const termLower = term.toLowerCase();
    const textLower = text.toLowerCase();

    let pos = 0;
    // biome-ignore lint/suspicious/noAssignInExpressions:
    while ((pos = textLower.indexOf(termLower, pos)) !== -1) {
      positions.push([pos, term.length]);
      pos += term.length;
    }

    return positions;
  }

  private createSearchResults(page: PageModel, terms: string[]): SearchResult {
    const contentPositions: SearchHitPosition[] = [];
    const titlePositions: SearchHitPosition[] = [];

    for (const term of terms) {
      contentPositions.push(
        ...this.extractPositionsFromMatches(page.pageContent, term)
      );
      titlePositions.push(
        ...this.extractPositionsFromMatches(page.pageTitle, term)
      );
    }

    contentPositions.sort((a, b) => a[0] - b[0]);
    titlePositions.sort((a, b) => a[0] - b[0]);

    const contentSnippets =
      contentPositions.length > 0
        ? this.createSnippets(page.pageContent, contentPositions)
        : [];

    const titleSnippets =
      titlePositions.length > 0
        ? [{ text: page.pageTitle, positions: titlePositions }]
        : [];

    return {
      pageId: page._id,
      pageSlug: page.pageSlug,
      title: page.pageTitle,
      terms,
      snippets: {
        title: titleSnippets,
        content: contentSnippets,
      },
    };
  }

  createSnippets(
    text: string,
    positions: SearchHitPosition[],
    snippetLength = SEARCH_SNIPPET_LENGTH,
    maxSnippets = 25
  ): SearchSnippet[] {
    if (positions.length === 0) return [];

    const snippets: SearchSnippet[] = [];
    let currentSnippet: SearchSnippet | null = null;
    const PADDING = Math.floor(Math.min(snippetLength / 2, text.length / 2));

    for (const [start, length] of positions) {
      if (currentSnippet) {
        const snippetEnd = currentSnippet.text.length;
        const relativeStart =
          start - (currentSnippet.positions[0][0] - PADDING);

        if (relativeStart <= snippetEnd + PADDING) {
          const newText = text.slice(
            Math.max(0, currentSnippet.positions[0][0] - PADDING),
            Math.min(text.length, start + length + PADDING)
          );
          currentSnippet.text = newText;
          currentSnippet.positions.push([start, length]);
          continue;
        }
      }

      if (snippets.length >= maxSnippets) break;

      const snippetStart = Math.max(0, start - PADDING);
      const snippetEnd = Math.min(text.length, start + length + PADDING);

      currentSnippet = {
        text: text.slice(snippetStart, snippetEnd),
        positions: [[start, length]],
      };
      snippets.push(currentSnippet);
    }

    return snippets.map((snippet) => {
      const snippetStart = Math.max(0, snippet.positions[0][0] - PADDING);
      const hasPrefix = snippetStart > 0; // Will we add the ellipsis prefix?
      const prefixLength = hasPrefix ? 2 : 0; // "… " adds 2 chars

      return {
        text:
          (hasPrefix ? '… ' : '') +
          text.slice(
            snippetStart,
            Math.min(
              text.length,
              snippet.positions[snippet.positions.length - 1][0] +
                snippet.positions[snippet.positions.length - 1][1] +
                PADDING
            )
          ) +
          (snippet.positions[snippet.positions.length - 1][0] +
            snippet.positions[snippet.positions.length - 1][1] +
            PADDING <
          text.length
            ? ' …'
            : ''),
        positions: snippet.positions.map(([start, length]) => [
          Math.max(0, start - snippetStart + prefixLength), // Add prefixLength to adjust for ellipsis
          length,
        ]),
      };
    });
  }

  public async search(q: string): Promise<SearchResult[]> {
    await this.indexBuilt;

    if (!q.trim()) {
      return [];
    }

    // Break query into terms for highlighting
    const terms = q
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => !flexsearchLangSettings.filter.includes(term));

    const allResults = await this.idx.search(q, {
      index: [SEARCH_FIELDS.TITLE, SEARCH_FIELDS.CONTENT],
      limit: 50,
    });

    const foundIds = new Set<string>();
    for (const hit of allResults) {
      for (const id of hit.result.map(String)) {
        foundIds.add(id);
      }
    }

    // Process results into SearchResult format
    const searchResults: SearchResult[] = [];
    if (foundIds.size > 0) {
      const pages = await Promise.all(
        [...foundIds].map((id) => this.dbs.getPageById(id))
      );

      for (const page of pages) {
        if (page) {
          searchResults.push(await this.createSearchResults(page, terms));
        }
      }
    }

    return searchResults;
  }
}
