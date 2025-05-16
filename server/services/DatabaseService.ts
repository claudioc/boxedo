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
    const dbName = config.BXD_DB_NAME;
    let db: Db;

    if (DatabaseService.instance) {
      logger.error('The database service is already initialized');
      return err(new Error('The database service is already initialized'));
    }

    DatabaseService.instance = new DatabaseService();

    try {
      switch (true) {
        case config.BXD_DB_BACKEND === 'memory' || config.NODE_ENV === 'test':
          PouchDB.plugin(PouchFind)
            .plugin(PouchReduce)
            .plugin(PouchAdapterMemory);
          db = new PouchDB<DocumentModel>(dbName);
          break;

        case config.BXD_DB_BACKEND === 'remote' && !!config.BXD_DB_REMOTE_URL:
          PouchDB.plugin(PouchHttp).plugin(PouchFind).plugin(PouchReduce);
          db = new PouchDB(`${config.BXD_DB_REMOTE_URL}/${dbName}`, {
            auth: {
              username: config.BXD_DB_REMOTE_USER,
              password: config.BXD_DB_REMOTE_PASSWORD,
            },
          });
          // Try an open operation to check if the connection is working
          await db.info();
          logger.info('Connected to remote database');
          break;

        case config.BXD_DB_BACKEND === 'local':
          {
            const pathResult = await ensurePathExists(
              config.BXD_DB_LOCAL_PATH,
              'database directory'
            );
            if (pathResult.isErr()) {
              return err(pathResult.error);
            }

            PouchDB.plugin(PouchAdapterLevelDb)
              .plugin(PouchFind)
              .plugin(PouchReduce);

            // Note: bootstrap is taking care of creating the directory if it doesn't exist
            db = new PouchDB<DocumentModel>(
              path.join(config.BXD_DB_LOCAL_PATH, `${dbName}.db`),
              {
                adapter: 'leveldb',
              }
            );
            // Try an open operation to check if the connection is working
            await db.info();
            logger.info('Connected to local database');
          }
          break;

        default:
          logger.error(
            'Database configuration inconsistent or unknown. Cannot continue.'
          );
          return err(
            new Error(
              'Database configuration inconsistent or unknown. Cannot continue.'
            )
          );
      }
    } catch (error) {
      logger.error(
        // biome-ignore lint/suspicious/noExplicitAny:
        `Error connecting to the database: ${(error as any)?.message}`
      );
      return err(new Error('Error connecting to the database'));
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

  private static async createIndexes(db: Db, logger?: AnyLogger) {
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
      logger?.error('Error creating indexes', error);
    }
  }

  private static async createViews(db: PouchDB.Database, logger?: AnyLogger) {
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
        logger?.error('Error creating design doc:', err);
        throw err;
      }
    }
  }

  static async nukeTests(db: Db) {
    // Note that tests also use a memory adapter and never a real one
    if (process.env.NODE_ENV !== 'test') return;

    const allDocs = await db.allDocs({ include_docs: true });
    const deletions = allDocs.rows
      .filter((row) => row.doc)
      .map((row) => ({
        ...row.doc,
        _deleted: true,
      }));

    if (deletions.length > 0) {
      await db.bulkDocs(deletions as DocumentModel[]);
    }

    try {
      await DatabaseService.createIndexes(db);
      await DatabaseService.createViews(db);
    } catch {
      // Index might already exist, that's fine
    }
  }

  getDatabase(): PouchDB.Database<DocumentModel> {
    return this.db;
  }
}
