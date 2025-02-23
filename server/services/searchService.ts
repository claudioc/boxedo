import Database from 'better-sqlite3';
import type { ConfigEnv, PageModel, SearchResult } from '~/../types';
import { MAX_INDEXABLE_DOCUMENTS } from '~/constants';
import { stopwords } from '~/locales/stopwords.en';
import type { DbService } from './dbService';

interface SearchRow {
  id: string;
  title_highlighted: string | null; // SQLite might return null
  content_snippet: string | null; // SQLite might return null
  slug: string;
}

const compressTextForSearch = (html: string): string => {
  // We also have cheerio available for html stripping but regexp are faster
  // and it's OK if they are inaccurate
  return html
    .replace(/<[^>]*>/g, ' ') // Replace tags with space
    .replace(/&nbsp;/g, ' ') // Replace &nbsp;
    .replace(/&[a-z]+;/g, ' ') // Replace other entities
    .toLowerCase() // Convert to lowercase
    .replace(/[\s\n\r\t]+/g, ' ') // Normalize whitespace
    .split(' ')
    .filter(
      (word) =>
        word.length > 2 && // Keep only words longer than 2 chars
        !stopwords.has(word) && // Remove stop words
        !/^\d+$/.test(word) // Remove pure number words
    )
    .join(' ')
    .trim();
};

export class SearchService {
  private static instance: SearchService | null = null;
  private db: Database.Database;
  private indexBuilt: Promise<void>;
  private resolveIndexBuilt!: () => void;
  private statements!: {
    insert: Database.Statement;
    update: Database.Statement;
    delete: Database.Statement;
    search: Database.Statement;
  };

  private constructor(
    private dbs: DbService,
    private config: ConfigEnv
  ) {
    this.indexBuilt = new Promise((resolve) => {
      this.resolveIndexBuilt = resolve;
    });

    try {
      this.db = new Database(
        `${this.config.DB_LOCAL_PATH ?? '.'}/fts_index.db`,
        {
          // verbose: console.log // Uncomment for SQL debugging
        }
      );

      // Create FTS5 virtual table if it doesn't exist
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
          id UNINDEXED,   -- Document ID, not searched
          title,          -- Indexed title field
          content,        -- Indexed content field
          slug UNINDEXED, -- URL slug, not searched
          title_full UNINDEXED,  -- Indexed title field with stopwords
          tokenize='porter unicode61 remove_diacritics 2'
        );
      `);

      this.prepareStatements();

      // Always rebuild the index in production, as the server bootstraps
      this.buildIndex(this.config.NODE_ENV === 'production');
    } catch (err) {
      console.error('Failed to initialize SQLite database:', err);
      throw err;
    }
  }

  private prepareStatements() {
    this.statements = {
      insert: this.db.prepare(
        'INSERT INTO pages_fts(id, title, content, slug, title_full) VALUES (?, ?, ?, ?, ?)'
      ),
      update: this.db.prepare(
        'INSERT OR REPLACE INTO pages_fts(id, title, content, slug, title_full) VALUES (?, ?, ?, ?, ?)'
      ),
      delete: this.db.prepare('DELETE FROM pages_fts WHERE id = ?'),
      search: this.db.prepare(`
        SELECT
          id,
          title_full,
          snippet(pages_fts, 2, '<mark>', '</mark>', '…', 64) as content_snippet,
          slug
        FROM pages_fts
        WHERE pages_fts MATCH ?
        ORDER BY bm25(pages_fts, 10, 5)
        LIMIT 50
      `),
    };
  }

  public static async getInstance(
    dbs?: DbService,
    config?: ConfigEnv
  ): Promise<SearchService> {
    if (!SearchService.instance && !dbs && !config) {
      throw new Error(
        'Cannot create an indexer instance without the database service and the config'
      );
    }

    if (!SearchService.instance && dbs && config) {
      SearchService.instance = new SearchService(dbs, config);
      await SearchService.instance.indexBuilt;
      return SearchService.instance;
    }

    if (!SearchService.instance) {
      throw new Error('Unexpected missed searchService instance');
    }

    return SearchService.instance;
  }

  public async buildIndex(forced = false) {
    try {
      if (!forced) {
        const nPage = await this.dbs.countPages();
        const nIndexed = this.db
          .prepare('SELECT COUNT(*) as count FROM pages_fts')
          .get() as { count: number };

        if (nPage === nIndexed.count) {
          console.log(`🔍 Search index is up to date with ${nPage} documents`);
          this.resolveIndexBuilt();
          return;
        }
      }

      const allDocs = (
        await this.dbs.db.find({
          selector: { type: 'page' },
          limit: MAX_INDEXABLE_DOCUMENTS,
        })
      ).docs as PageModel[];

      // Create insert transaction for better performance
      const insertDocs = this.db.transaction((docs: PageModel[]) => {
        this.db.prepare('DELETE FROM pages_fts').run();

        // Insert all documents
        for (const doc of docs) {
          this.statements.insert.run(
            doc._id,
            compressTextForSearch(doc.pageTitle),
            compressTextForSearch(doc.pageContent),
            doc.pageSlug,
            doc.pageTitle
          );
        }
      });

      // Run the transaction
      insertDocs(allDocs);

      console.log(`🔍 SQLite FTS index built with ${allDocs.length} documents`);
      this.resolveIndexBuilt();
    } catch (err) {
      console.error('Failed to build index:', err);
      throw err;
    }
  }

  public async addDocument(doc: PageModel): Promise<void> {
    await this.indexBuilt;
    this.statements.insert.run(
      doc._id,
      doc.pageTitle,
      compressTextForSearch(doc.pageContent),
      doc.pageSlug
    );
  }

  public async removeDocument(id: string): Promise<void> {
    await this.indexBuilt;
    this.statements.delete.run(id);
  }

  public async updateDocument(doc: PageModel): Promise<void> {
    await this.indexBuilt;
    this.statements.update.run(
      doc._id,
      doc.pageTitle,
      compressTextForSearch(doc.pageContent),
      doc.pageSlug
    );
  }

  public async search(q: string): Promise<SearchResult[]> {
    await this.indexBuilt;

    if (!q.trim()) {
      return [];
    }

    try {
      const rows = this.statements.search.all(q) as SearchRow[];
      const searchResults: SearchResult[] = [];

      for (const row of rows) {
        const page = await this.dbs.getPageById(row.id);
        if (!page) continue;

        searchResults.push({
          pageId: row.id,
          pageSlug: row.slug,
          title: this.highlightTitle(q, page.pageTitle),
          snippets: row.content_snippet || '',
        });
      }

      return searchResults;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  // We use our own highlighter because sqlite FTS cannot highlight fields
  // that are not indexed and we want to index the full title with the stopwords
  // because we use it to display the results
  private highlightTitle(query: string, title: string): string {
    // Normalize the query: remove special characters and split into words
    const queryWords = query
      .toLowerCase()
      .replace(/[\^+\-"]/g, '') // Remove common FTS query syntax
      .split(/\s+/) // Split on whitespace
      .filter((word) => !stopwords.has(word) && word.length > 0); // Remove stopwords

    if (queryWords.length === 0) return title;

    // Create a regex pattern that matches any of the query words
    const pattern = new RegExp(`(${queryWords.join('|')})`, 'gi');

    // Replace matches with marked version
    return title.replace(pattern, '<mark>$1</mark>');
  }

  public close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}
