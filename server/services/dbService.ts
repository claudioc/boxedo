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
  FileAttachmentModel,
  FileModel,
  MagicModel,
  ModelName,
  PageModel,
  UserModel,
} from '~/../types';
import { Feedbacks } from '~/lib/feedbacks';
import { ensurePathExists, extractFileRefsFrom } from '~/lib/helpers';

const isTestRun = process.env.NODE_ENV === 'test';

const streamToBuffer = async (
  stream: NodeJS.ReadableStream
): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export type DbClient = PouchDB.Database<DocumentModel>;
export type DbService = ReturnType<typeof dbService>;

export const dbService = (client?: DbClient) => {
  if (!client) throw new Error(Feedbacks.E_MISSING_DB.message);

  return {
    db: client,

    async insertFile(
      file: FileModel
    ): Promise<Result<PouchDB.Core.Response, Feedback>> {
      try {
        return ok(await this.db.put(file));
      } catch (error) {
        console.log('Error inserting a file', error);
        return err(Feedbacks.E_CREATING_FILE);
      }
    },

    async insertFileAttachment(
      attachment: FileAttachmentModel
    ): Promise<Result<PouchDB.Core.Response, Feedback>> {
      try {
        // Get the current rev of the document
        const doc = await this.db.get(attachment.fileId);

        // Convert stream to buffer if needed
        const buffer =
          attachment.attachment instanceof Buffer
            ? attachment.attachment
            : await streamToBuffer(
                attachment.attachment as NodeJS.ReadableStream
              );

        return ok(
          await this.db.putAttachment(
            attachment.fileId,
            attachment.attachmentName,
            doc._rev,
            buffer,
            attachment.contentType
          )
        );
      } catch (error) {
        console.log('Error inserting a file attachment', error);
        return err(Feedbacks.E_CREATING_ATTACHMENT);
      }
    },

    async cleanupOrphanedFiles(): Promise<Result<number, Feedback>> {
      /* Our main assumption here is that each file has only one attachment,
       * even though CouchDb allows multiple attachments per document.
       * This simplifies the logic and is sufficient for our use case; in a more
       * complex scenario we would have to consider which attachments are used.
       */
      try {
        const usedFiles = new Set<string>();
        const pagesResult = (await this.db.find({
          selector: {
            type: 'page',
          },
        })) as PouchDB.Find.FindResponse<PageModel>;

        // Extract file references from all pages
        pagesResult.docs.forEach((doc) => {
          extractFileRefsFrom(doc.pageContent ?? '').forEach((ref) =>
            usedFiles.add(ref)
          );
        });

        const filesResult = (await this.db.find({
          selector: {
            type: 'file',
          },
        })) as PouchDB.Find.FindResponse<FileModel>;

        // Find unused files
        const unusedFiles = filesResult.docs.filter(
          (file) => !usedFiles.has(file._id)
        );

        if (unusedFiles.length === 0) {
          return ok(0);
        }

        const deleteOps: PouchDB.Core.PutDocument<FileModel>[] =
          unusedFiles.map((file) => ({
            ...file,
            _deleted: true,
          }));

        // Delete in batches of 50
        const BATCH_SIZE = 50;
        for (let i = 0; i < deleteOps.length; i += BATCH_SIZE) {
          const batch = deleteOps.slice(i, i + BATCH_SIZE);
          await this.db.bulkDocs(batch);
        }

        return ok(unusedFiles.length);
      } catch (error) {
        console.error('Error cleaning up orphaned files:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

    async getFileById(
      fileId: string
    ): Promise<Result<FileModel | null, Feedback>> {
      try {
        return ok(await this.db.get(fileId));
      } catch (error) {
        if ((error as PouchDB.Core.Error)?.status !== 404) {
          console.error('Error getting a file by id:', err);
          return err(Feedbacks.E_UNKNOWN_ERROR);
        }
        return ok(null);
      }
    },

    async getFileAttachment(
      fileId: string,
      attachmentName: string
    ): Promise<Result<Blob | Buffer<ArrayBufferLike> | null, Feedback>> {
      try {
        return ok(await this.db.getAttachment(fileId, attachmentName));
      } catch (error) {
        if ((error as PouchDB.Core.Error).status !== 404) {
          console.error('Error getting a attachment by id:', error);
          return err(Feedbacks.E_UNKNOWN_ERROR);
        }
        return ok(null);
      }
    },

    async createMagic(
      email: string,
      ttlMinutes: number
    ): Promise<Result<MagicModel, Feedback>> {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlMinutes * 60000);

      const data: MagicModel = {
        _id: dbService.generateIdFor('magic'),
        type: 'magic',
        email,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        used: false,
      };

      try {
        await this.db.put(data);
        return ok(data);
      } catch (error) {
        console.error('Error creating magic link:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

    async validateMagic(
      magicId: string
    ): Promise<Result<string | null, Feedback>> {
      try {
        const result = (await this.db.find({
          selector: {
            type: 'magic',
            _id: magicId,
            used: false,
            expiresAt: {
              $gt: new Date().toISOString(),
            },
          },
          limit: 1,
        })) as PouchDB.Find.FindResponse<MagicModel>;

        if (result.docs.length === 0) {
          return ok(null);
        }

        // Mark token as used
        const magic = result.docs[0];
        magic.used = true;
        await this.db.put(magic);
        return ok(magic.email);
      } catch (error) {
        console.error('Error validating magic link:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

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
