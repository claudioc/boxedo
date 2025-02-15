import lunr from 'lunr';
import type {
  PageModel,
  SearchContentSnippet,
  SearchHitPosition,
  SearchResult,
} from '~/../types';
import { SEARCH_SNIPPET_LENGTH } from '~/constants';
import type { DbService } from './dbService';

// Pick<PageModel, 'pageTitle' | 'pageContent' | 'pageSlug'>;
// These keys are used all over the place and it's better
// if they are stored as constants
const SEARCH_FIELDS = {
  CONTENT: 'pageContent',
  TITLE: 'pageTitle',
} as const;

type SearchField = (typeof SEARCH_FIELDS)[keyof typeof SEARCH_FIELDS];

type SearchMatchHits = Record<SearchField, SearchHitPosition[]>;

type SearchMetadata = Record<
  string, // Each searched terms
  Partial<Record<SearchField, { position: SearchHitPosition[] }>>
>;

export class SearchService {
  private static instance: SearchService | null = null;
  private dbs: DbService;
  private idx: lunr.Index | null = null;
  private indexBuilt: Promise<void>;
  private resolveIndexBuilt!: () => void;

  private constructor(dbs: DbService) {
    this.dbs = dbs;
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
          limit: 100000,
        })
      ).docs;

      this.idx = lunr(function (this: lunr.Builder) {
        this.ref('_id');
        this.field(SEARCH_FIELDS.TITLE);
        this.field(SEARCH_FIELDS.CONTENT);
        this.metadataWhitelist = ['position', 'index'];

        allDocs.forEach((doc) => this.add(doc));
      });

      console.log('🔍 Lunr index built with', allDocs.length, 'documents');
      this.resolveIndexBuilt();
    } catch (err) {
      console.error('Failed to build index:', err);
      throw err;
    }
  }

  public async getIndex(): Promise<lunr.Index> {
    await this.indexBuilt;
    if (!this.idx) {
      throw new Error('Index not built');
    }
    return this.idx;
  }

  public async rebuildIndex(): Promise<void> {
    this.indexBuilt = new Promise((resolve) => {
      this.resolveIndexBuilt = resolve;
    });
    await this.buildIndex();
  }

  private normalizeMetadata(
    metadata: lunr.MatchData['metadata']
  ): SearchMetadata {
    // The metadata object is encoded in a weird way and despite
    // a potential hit on performance, it's worth simplifying the
    // normalization with JSON
    return JSON.parse(JSON.stringify(metadata));
  }

  private collectHits(metadata: SearchMetadata): SearchMatchHits {
    const hits: SearchMatchHits = {
      [SEARCH_FIELDS.TITLE]: [] as SearchHitPosition[],
      [SEARCH_FIELDS.CONTENT]: [] as SearchHitPosition[],
    };

    Object.values(metadata).forEach((term) => {
      // biome-ignore lint/suspicious/noExplicitAny:
      Object.entries(term as any).forEach(([field, data]) => {
        if (field === SEARCH_FIELDS.TITLE || field === SEARCH_FIELDS.CONTENT) {
          hits[field].push(
            ...(data as { position: SearchHitPosition[] }).position
          );
        }
      });
    });

    // Sort each array by start position
    hits[SEARCH_FIELDS.TITLE].sort((a, b) => a[0] - b[0]);
    hits[SEARCH_FIELDS.CONTENT].sort((a, b) => a[0] - b[0]);

    // console.log(JSON.stringify(hits, null, 2));

    return hits;
  }

  private createSearchResults(
    page: PageModel,
    terms: string[],
    hits: SearchMatchHits
  ): SearchResult {
    const snippets =
      hits.pageContent.length > 0
        ? this.createSnippets(page.pageContent, hits.pageContent)
        : [];

    return {
      pageId: page._id,
      pageSlug: page.pageSlug,
      title: page.pageTitle,
      titleHasMatch: false,
      terms,
      snippets,
    };
  }

  createSnippets(
    text: string,
    positions: SearchHitPosition[],
    snippetLength = SEARCH_SNIPPET_LENGTH,
    maxSnippets = 25
  ): SearchContentSnippet[] {
    if (positions.length === 0) return [];

    const snippets: SearchContentSnippet[] = [];
    let currentSnippet: SearchContentSnippet | null = null;
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
    const results = (await this.getIndex()).search(q).slice(0, 25);
    if (results.length === 0) {
      return [];
    }

    const searchResults: SearchResult[] = [];
    for await (const result of results) {
      const match = this.normalizeMetadata(result.matchData.metadata);
      // console.log(JSON.stringify(result, null, 2));
      // console.log(JSON.stringify(match, null, 2));

      const page = await this.dbs.getPageById(result.ref);

      if (page) {
        searchResults.push(
          this.createSearchResults(
            page,
            Object.keys(match),
            this.collectHits(match)
          )
        );
      }
    }

    // console.log(searchResults);

    return searchResults;
  }
}
