import { type Result, err, ok } from 'neverthrow';
import PouchHttp from 'pouchdb-adapter-http';
import PouchDB from 'pouchdb-core';
import type { AnyLogger, ConfigEnv, Db, DocumentModel } from '~/../types';
// Remember to exclude this one from bundling in esbuild
import PouchAdapterLevelDb from 'pouchdb-adapter-leveldb';
import PouchAdapterMemory from 'pouchdb-adapter-memory';
// PouchFind provides a simple, MongoDB-inspired query language that accomplishes
// the same thing as the map/reduce API, but with far less code.
import path from 'node:path';
import PouchFind from 'pouchdb-find';
import PouchReduce from 'pouchdb-mapreduce';
import { ensurePathExists } from '~/lib/helpers';

interface DatabaseServiceOptions {
  config: ConfigEnv;
  logger: AnyLogger;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db!: Db;

  private constructor() {}

  static async create(
    options: DatabaseServiceOptions
  ): Promise<Result<DatabaseService, Error>> {
    const { config, logger } = options;
    const dbName = config.DB_NAME;
    let db: Db;

    if (DatabaseService.instance) {
      logger.error('The database service is already initialized');
      return err(new Error('The database service is already initialized'));
    }

    DatabaseService.instance = new DatabaseService();

    switch (true) {
      case config.DB_BACKEND === 'memory' || config.NODE_ENV === 'test':
        PouchDB.plugin(PouchFind)
          .plugin(PouchReduce)
          .plugin(PouchAdapterMemory);
        db = new PouchDB<DocumentModel>(dbName);
        break;

      case config.DB_BACKEND === 'remote' && !!config.DB_REMOTE_URL:
        PouchDB.plugin(PouchHttp).plugin(PouchFind).plugin(PouchReduce);
        db = new PouchDB(`${config.DB_REMOTE_URL}/${dbName}`, {
          auth: {
            username: config.DB_REMOTE_USER,
            password: config.DB_REMOTE_PASSWORD,
          },
        });
        logger.info('Connected to remote database');
        break;

      case config.DB_BACKEND === 'local':
        await ensurePathExists(config.DB_LOCAL_PATH, 'database directory');

        PouchDB.plugin(PouchAdapterLevelDb)
          .plugin(PouchFind)
          .plugin(PouchReduce);

        // Note: bootstrap is taking care of creating the directory if it doesn't exist
        db = new PouchDB<DocumentModel>(
          path.join(config.DB_LOCAL_PATH, `${dbName}.db`),
          {
            adapter: 'leveldb',
          }
        );
        logger.info('Connected to local database');
        break;

      default:
        logger.error(
          'Database configuration inconsistent or unknown. Cannot continue.'
        );
        throw new Error(
          'Database configuration inconsistent or unknown. Cannot continue.'
        );
    }

    try {
      await DatabaseService.createIndexes(db, logger);
      await DatabaseService.createViews(db, logger);
    } catch {
      // Index might already exist, that's fine
    }

    DatabaseService.instance.db = db;

    return ok(DatabaseService.instance);
  }

  static getInstance(): Result<DatabaseService, Error> {
    if (!DatabaseService.instance) {
      return err(new Error('Unexpected missed database instance'));
    }

    return ok(DatabaseService.instance);
  }

  private static async createIndexes(db: Db, logger: AnyLogger) {
    try {
      await db.createIndex({
        index: {
          fields: ['type', 'parentId', 'createdAt'],
        },
      });

      await db.createIndex({
        index: {
          fields: ['position'],
        },
      });

      await db.createIndex({
        index: {
          fields: ['type', 'position', 'parentId'],
        },
      });
    } catch (error) {
      logger.error('Error creating indexes', error);
    }
  }

  private static async createViews(db: PouchDB.Database, logger: AnyLogger) {
    const designDoc = {
      _id: '_design/pages',
      views: {
        by_parent_position: {
          map: `function(doc) {
            if (doc.type === 'page' && doc.position !== undefined) {
              emit([doc.parentId || null, doc.position], null);
            }
          }`,
        },

        count: {
          map: `function (doc) {
            if (doc.type === 'page') {
              emit(null, 1);
            }
          }`,
          reduce: '_count',
        },
      },
    };

    try {
      await db.put(designDoc);
    } catch (err) {
      if ((err as PouchDB.Core.Error).status === 409) {
        const existing = await db.get('_design/pages');
        const updatedDoc = {
          ...designDoc,
          _rev: existing._rev, // Add the _rev from the existing document
        };
        await db.put(updatedDoc);
      } else {
        logger.error('Error creating design doc:', err);
        throw err;
      }
    }
  }

  getDatabase(): PouchDB.Database<DocumentModel> {
    return this.db;
  }
}

/*
// Base Repository Interface
interface Repository<T, ID> {
  findById(id: ID): Promise<Result<T | null, Error>>;
  save(entity: T): Promise<Result<T, Error>>;
  // Common methods...
}

// PageRepository.ts
export class PageRepository implements Repository<PageModel, string> {
  constructor(private db: PouchDB.Database<DocumentModel>) {}

  async findById(id: string): Promise<Result<PageModel | null, Error>> {
    try {
      const doc = await this.db.get(id);
      return ok(doc.type === 'page' ? doc as PageModel : null);
    } catch (err) {
      if ((err as PouchDB.Core.Error).status === 404) {
        return ok(null);
      }
      return err(new Error(`Failed to find page: ${err.message}`));
    }
  }

  async findBySlug(slug: string): Promise<Result<PageModel | null, Error>> {
    // Implementation...
  }

  async save(page: PageModel): Promise<Result<PageModel, Error>> {
    // Implementation...
  }

  // More page-specific methods...
}

// SettingsRepository.ts
export class SettingsRepository {
  constructor(private db: PouchDB.Database<DocumentModel>) {}

  async getSettings(): Promise<Result<SettingsModel, Error>> {
    // Implementation...
  }

  async updateSettings(settings: SettingsModel): Promise<Result<SettingsModel, Error>> {
    // Implementation...
  }
}

// Similar repositories for User, File, etc.
3. Factory for Creating Repositories
typescript

Copy
// RepositoryFactory.ts
export class RepositoryFactory {
  private static instance: RepositoryFactory;
  private pageRepository: PageRepository;
  private settingsRepository: SettingsRepository;
  // Other repositories...

  private constructor(private db: PouchDB.Database<DocumentModel>) {
    this.pageRepository = new PageRepository(db);
    this.settingsRepository = new SettingsRepository(db);
    // Initialize other repositories...
  }

  static initialize(db: PouchDB.Database<DocumentModel>): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory(db);
    }
    return RepositoryFactory.instance;
  }

  getPageRepository(): PageRepository {
    return this.pageRepository;
  }

  getSettingsRepository(): SettingsRepository {
    return this.settingsRepository;
  }

  // Getter methods for other repositories...
}
4. Usage in Application
typescript

Copy
// Initialization
const dbServiceResult = await DatabaseService.initialize(config);
if (dbServiceResult.isErr()) {
  // Handle error
}

const dbService = dbServiceResult.value;
const repositories = RepositoryFactory.initialize(dbService.getDatabase());

// Usage in routes
app.get('/settings', async (req, rep) => {
  const settingsRepo = repositories.getSettingsRepository();
  const settingsResult = await settingsRepo.getSettings();

  return settingsResult.match(
    settings => rep.send(settings),
    error => rep.code(500).send({ error: error.message })
  );
});
*/
