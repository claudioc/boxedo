import Database from 'better-sqlite3';
import type {
  AnyLogger,
  ConfigEnv,
  PageModel,
  SearchResult,
  SearchTitlesResult,
} from 'boxedo-core/types';
import { err, ok, type Result } from 'neverthrow';
import { MAX_INDEXABLE_DOCUMENTS } from '~/constants';
import {
  compressTextForSearch,
  ensurePathExists,
  highlightPhrase,
  prepareFTSQuery,
} from '~/lib/helpers';
import type { RepositoryFactory } from '~/repositories/RepositoryFactory';

interface SearchServiceOptions {
  repoFactory: RepositoryFactory;
  config: ConfigEnv;
  logger: AnyLogger;
}

interface SearchRow {
  id: string;
  title_highlighted: string | null; // SQLite might return null
  content_snippet: string | null; // SQLite might return null
  slug: string;
}

export class SearchService {
  private static instance: SearchService | null = null;
  // This is the Sqlite3 database
  private db: Database.Database;
  private indexBuilt: Promise<void>;
  private resolveIndexBuilt!: () => void;
  private statements!: {
    update: Database.Statement;
    delete: Database.Statement;
    search: Database.Statement;
    searchTitle: Database.Statement;
  };
  // biome-ignore lint/suspicious/noExplicitAny:
  private changeListener: PouchDB.Core.Changes<any> | null = null;

  private constructor(
    private repos: RepositoryFactory,
    private config: ConfigEnv,
    private logger: AnyLogger
  ) {
    this.indexBuilt = new Promise((resolve) => {
      this.resolveIndexBuilt = resolve;
    });

    try {
      this.db = new Database(
        `${this.config.BXD_DB_LOCAL_PATH ?? '.'}/fts_index.db`,
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

      if (this.config.NODE_ENV !== 'test') {
        // Always rebuild the index in production, as the server bootstraps
        this.buildIndex(this.config.NODE_ENV === 'production');
        this.setupChangeListener();
      }
    } catch (err) {
      logger.error(`Failed to initialize SQLite database: ${err}`);
      throw err;
    }
  }

  public static async create(
    options: SearchServiceOptions
  ): Promise<Result<SearchService, Error>> {
    const { repoFactory, config, logger } = options;

    if (!SearchService.instance) {
      try {
        const pathResult = await ensurePathExists(
          config.BXD_DB_LOCAL_PATH,
          'database directory'
        );
        if (pathResult.isErr()) {
          return err(pathResult.error);
        }
        SearchService.instance = new SearchService(repoFactory, config, logger);
        await SearchService.instance.indexBuilt;
      } catch (error) {
        logger.error(`Failed to initialize search service: ${error}`);
        return err(error as Error);
      }
    }

    return ok(SearchService.instance);
  }

  public static getInstance(): Result<SearchService, Error> {
    // Building the instance is the responsibility of the caller (using .create)
    if (!SearchService.instance) {
      return err(new Error('Unexpected missed searchService instance'));
    }

    return ok(SearchService.instance);
  }

  private setupChangeListener() {
    this.changeListener = this.repos
      .getDb()
      .changes({
        since: 'now',
        live: true,
        include_docs: true,
      })
      .on('change', async (change) => {
        if (change?.doc?.type === 'page') {
          // We cannot really distinguish between inserts and updates
          // See also https://pouchdb.com/guides/changes.html
          try {
            if (change.deleted) {
              await this.removeDocument(change.id);
            } else {
              await this.updateDocument(change.doc);
            }
          } catch (error) {
            this.logger.error(`Failed to update search index: ${error}`);
          }
        }
      })
      .on('error', (err) => {
        this.logger.error(`Error in changes feed: ${err}`);
        // Maybe try to reconnect after a delay
        setTimeout(() => this.setupChangeListener(), 5000);
      });
  }

  private prepareStatements() {
    this.statements = {
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
      searchTitle: this.db.prepare(`
        SELECT
          id,
          title_full
        FROM pages_fts
        WHERE title MATCH ?
        ORDER BY bm25(pages_fts, 10, 0)
        LIMIT 25
      `),
    };
  }

  private async buildIndex(forced = false) {
    try {
      if (!forced) {
        const nPage = (await this.repos.getPageRepository().countPages()).match(
          (count) => count,
          (_) => 0
        );
        const nIndexed = this.db
          .prepare('SELECT COUNT(*) as count FROM pages_fts')
          .get() as { count: number };

        if (nPage === nIndexed.count) {
          this.logger.info(
            `🔍 Search index is up to date with ${nPage} documents`
          );
          this.resolveIndexBuilt();
          return;
        }
      }

      const allDocs = (
        await this.repos.getDb().find({
          selector: { type: 'page' },
          limit: MAX_INDEXABLE_DOCUMENTS,
        })
      ).docs as PageModel[];

      // Create insert transaction for better performance
      const insertDocs = this.db.transaction((docs: PageModel[]) => {
        this.db.prepare('DELETE FROM pages_fts').run();

        // Insert all documents
        for (const doc of docs) {
          this.statements.update.run(
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

      this.logger.info(
        `🔍 SQLite FTS index built with ${allDocs.length} documents`
      );
      this.resolveIndexBuilt();
    } catch (err) {
      this.logger.error(`Failed to build index: ${err}`);
      throw err;
    }
  }

  private async removeDocument(id: string): Promise<void> {
    await this.indexBuilt;
    this.statements.delete.run(id);
  }

  private async updateDocument(doc: PageModel): Promise<void> {
    await this.indexBuilt;
    this.statements.update.run(
      doc._id,
      compressTextForSearch(doc.pageTitle),
      compressTextForSearch(doc.pageContent),
      doc.pageSlug,
      doc.pageTitle
    );
  }

  public async search(q: string): Promise<Result<SearchResult[], []>> {
    await this.indexBuilt;

    const query = prepareFTSQuery(q);

    if (query === '') {
      return ok([]);
    }

    try {
      // Booleans are only considered when uppercase, so this is what we do
      const rows = this.statements.search.all(query) as SearchRow[];
      const searchResults: SearchResult[] = [];

      for (const row of rows) {
        const page = (
          await this.repos.getPageRepository().getPageById(row.id)
        ).match(
          (page) => page,
          (feedback) => {
            this.logger.error(
              `Error getting a page while searching: ${feedback.message}`
            );
            return null;
          }
        );

        if (!page) continue;

        searchResults.push({
          pageId: row.id,
          pageSlug: row.slug,
          title: highlightPhrase(q, page.pageTitle),
          snippets: row.content_snippet || '',
        });
      }

      return ok(searchResults);
    } catch (error) {
      this.logger.error(`Search error: ${error}`);
      return ok([]);
    }
  }

  public async searchByTitle(
    q: string
  ): Promise<Result<SearchTitlesResult[], []>> {
    await this.indexBuilt;

    const query = prepareFTSQuery(q);

    if (query === '') {
      return ok([]);
    }

    try {
      const rows = this.statements.searchTitle.all(query) as {
        id: string;
        title_full: string;
      }[];

      return ok(
        rows
          .filter((row) => row.title_full !== null)
          .map((row) => ({
            pageId: row.id,
            pageTitle: row.title_full,
          }))
      );
    } catch (error) {
      this.logger.error(`Title search error: ${error}`);
      return ok([]);
    }
  }

  public close(): void {
    if (this.changeListener) {
      this.changeListener.cancel();
      this.changeListener = null;
    }
    if (this.db) {
      this.db.close();
    }
  }
}
