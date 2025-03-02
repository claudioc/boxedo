import { type Result, err, ok } from 'neverthrow';
import PouchDB from 'pouchdb-core';

import PouchHttp from 'pouchdb-adapter-http';
// Remember to exclude this one from bundling in esbuild
import PouchAdapterLevelDb from 'pouchdb-adapter-leveldb';
import PouchAdapterMemory from 'pouchdb-adapter-memory';
// PouchFind provides a simple, MongoDB-inspired query language that accomplishes
// the same thing as the map/reduce API, but with far less code.
import PouchFind from 'pouchdb-find';
import PouchReduce from 'pouchdb-mapreduce';

import { createId } from '@paralleldrive/cuid2';
import path from 'node:path';
import type {
  DbServiceInitParams,
  DocumentModel,
  Feedback,
  ModelName,
  UserModel,
} from '~/../types';
import { Feedbacks } from '~/lib/feedbacks';
import { ensurePathExists } from '~/lib/helpers';

const isTestRun = process.env.NODE_ENV === 'test';

export type DbClient = PouchDB.Database<DocumentModel>;
export type DbService = ReturnType<typeof dbService>;

export const dbService = (client?: DbClient) => {
  if (!client) throw new Error(Feedbacks.E_MISSING_DB.message);

  return {
    db: client,

    async getUserByEmail(
      email: string
    ): Promise<Result<UserModel | null, Feedback>> {
      try {
        const result = (await this.db.find({
          selector: {
            type: 'user',
            email,
          },
          limit: 1,
        })) as PouchDB.Find.FindResponse<UserModel>;

        return ok(result.docs[0] || null);
      } catch (error) {
        console.error('Error getting user by email:', error);
        return ok(null);
      }
    },

    async getAllUsers(): Promise<Result<UserModel[], Feedback>> {
      try {
        const result = (await this.db.find({
          selector: {
            type: 'user',
          },
        })) as PouchDB.Find.FindResponse<UserModel>;

        return ok(result.docs);
      } catch (error) {
        console.error('Error getting all users:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

    async insertUser(user: UserModel): Promise<Result<void, Feedback>> {
      try {
        await this.db.put(user);
        return ok();
      } catch (error) {
        console.log('Error inserting a user', error);
        return err(Feedbacks.E_CREATING_USER);
      }
    },

    async updateUser(user: UserModel): Promise<Result<void, Feedback>> {
      try {
        await this.db.put(user);
        return ok();
      } catch (error) {
        console.log('Error updating a user', error);
        return err(Feedbacks.E_UPDATING_USER);
      }
    },

    async deleteUser(userId: string): Promise<Result<void, Feedback>> {
      try {
        const user = await this.db.get(`user:${userId}`);
        await this.db.remove(user);
        return ok();
      } catch (error) {
        // If user doesn't exist (404) just ignore
        if ((error as PouchDB.Core.Error).status !== 404) {
          console.log('Error deleting a user', error);
          return err(Feedbacks.E_DELETING_USER);
        }
        return ok();
      }
    },

    async nukeTests() {
      if (!isTestRun) return;

      const allDocs = await this.db.allDocs({ include_docs: true });
      const deletions = allDocs.rows
        .filter((row) => row.doc)
        .map((row) => ({
          ...row.doc,
          _deleted: true,
        }));

      if (deletions.length > 0) {
        await this.db.bulkDocs(deletions as DocumentModel[]);
      }

      try {
        // await dbService._createIndexes(this.db);
        // await dbService._createViews(this.db);
      } catch {
        // Index might already exist, that's fine
      }
    },
  };
};

// bulk-load uses the same logic
dbService.generateIdFor = (model: ModelName) => `${model}:${createId()}`;

dbService.init = async (params: DbServiceInitParams): Promise<DbClient> => {
  const { config } = params;
  const dbName = config.DB_NAME;
  let db: DbClient;

  switch (true) {
    case config.DB_BACKEND === 'memory' ||
      config.NODE_ENV === 'test' ||
      isTestRun:
      PouchDB.plugin(PouchFind).plugin(PouchReduce).plugin(PouchAdapterMemory);
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
      break;

    case config.DB_BACKEND === 'local':
      await ensurePathExists(config.DB_LOCAL_PATH, 'database directory');

      PouchDB.plugin(PouchAdapterLevelDb).plugin(PouchFind).plugin(PouchReduce);

      // Note: bootstrap is taking care of creating the directory if it doesn't exist
      db = new PouchDB<DocumentModel>(
        path.join(config.DB_LOCAL_PATH, `${dbName}.db`),
        {
          adapter: 'leveldb',
        }
      );
      break;

    default:
      throw new Error(
        'Database configuration inconsistent or unknown. Cannot continue.'
      );
  }

  return db;
};
