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
import sanitizeHtml from 'sanitize-html';
import slugify from 'slugify';
import type {
  DbServiceInitParams,
  DocumentModel,
  Feedback,
  FileAttachmentModel,
  FileModel,
  MagicModel,
  ModelName,
  NavItem,
  PageModel,
  SessionModel,
  UserModel,
} from '~/../types';
import { POSITION_GAP_SIZE } from '~/constants';
import { Feedbacks } from '~/lib/feedbacks';
import { ensurePathExists, extractFileRefsFrom, slugUrl } from '~/lib/helpers';

// https://github.com/apostrophecms/sanitize-html
const safeHtml = (str: string) =>
  sanitizeHtml(str, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      a: ['href', 'rel', 'target'],
      img: [
        'src',
        'srcset',
        'alt',
        'title',
        'width',
        'height',
        'loading',
        'class',
        'style',
        // Used by tiptap Image extension
        'data-alignment',
      ],
      table: ['class'],
    },
  });

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

    async countPages(): Promise<Result<number, Feedback>> {
      try {
        const result = await this.db.query('pages/count', { reduce: true });
        return ok(result.rows[0]?.value || 0);
      } catch (error) {
        console.error('Error counting pages:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

    async getPageById(
      pageId: string
    ): Promise<Result<PageModel | null, Feedback>> {
      try {
        const doc = await this.db.get(pageId);
        // Only return if it's actually a page
        return ok(doc.type === 'page' ? doc : null);
      } catch (error) {
        if ((error as PouchDB.Core.Error).status === 404) {
          return ok(null);
        }

        console.error('Error getting a page by id:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

    async getPageBySlug(
      slug: string
    ): Promise<Result<PageModel | null, Feedback>> {
      try {
        const result = await this.db.find({
          selector: {
            type: 'page',
            pageSlug: slug,
          },
          limit: 1,
        });

        return ok(
          result.docs.length > 0 ? (result.docs[0] as PageModel) : null
        );
      } catch (error) {
        if ((error as PouchDB.Core.Error).status === 404) {
          return ok(null);
        }

        console.error('Error getting a page by slug:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

    async lookupPageBySlug(
      slug: string
    ): Promise<Result<PageModel | null, Feedback>> {
      try {
        const result = await this.db.find({
          selector: {
            type: 'page',
            pageSlugs: {
              $elemMatch: { $eq: slug },
            },
          },
          limit: 1,
        });

        return ok(
          result.docs.length > 0 ? (result.docs[0] as PageModel) : null
        );
      } catch (error) {
        if ((error as PouchDB.Core.Error).status === 404) {
          return ok(null);
        }

        console.error('Error looking up a page by slug:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

    async generateUniqueSlug(title: string): Promise<Result<string, Feedback>> {
      let slug = slugify(title.trim(), { lower: true });
      let uniqueSlugFound = false;
      let counter = 1;

      try {
        while (!uniqueSlugFound) {
          const result = await this.db.find({
            selector: {
              type: 'page',
              $or: [
                { pageSlug: slug },
                { pageSlugs: { $elemMatch: { $eq: slug } } },
              ],
            },
            limit: 1,
          });

          const slugAlreadyInUse = result.docs.length > 0;

          if (slugAlreadyInUse) {
            slug = `${slugify(title.trim(), { lower: true })}-${counter++}`;
          } else {
            uniqueSlugFound = true;
          }
        }

        return ok(slug);
      } catch (error) {
        console.error('Error generating unique slug:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

    async findInsertPosition(
      parentId: string | null,
      targetIndex = Number.POSITIVE_INFINITY,
      pageId?: string
    ): Promise<Result<number, Feedback>> {
      try {
        const siblings = await this.db.query<PageModel>(
          'pages/by_parent_position',
          {
            startkey: [parentId],
            endkey: [parentId, {}],
            include_docs: true,
          }
        );

        // biome-ignore lint/style/noNonNullAssertion:
        let pages = siblings.rows.map((row) => row.doc!);
        if (pageId) {
          pages = pages.filter((page) => page?._id !== pageId);
        }

        // No siblings - first page
        if (pages.length === 0) {
          return ok(POSITION_GAP_SIZE);
        }

        // Append at end
        if (targetIndex >= pages.length) {
          return ok(pages[pages.length - 1].position + POSITION_GAP_SIZE);
        }

        // Insert at beginning
        if (targetIndex === 0) {
          return ok(pages[0].position / 2);
        }

        // Insert between pages
        const prevPosition = pages[targetIndex - 1].position;
        const nextPosition = pages[targetIndex].position;
        return ok((prevPosition + nextPosition) / 2);
      } catch (error) {
        console.error('Error finding insert position:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

    async insertPage(page: PageModel): Promise<Result<void, Feedback>> {
      page.pageContent = safeHtml(page.pageContent);
      page.pageTitle = safeHtml(page.pageTitle);
      page.contentUpdated = true;

      try {
        await this.db.put(page);
        return ok();
      } catch (error) {
        console.log('Error inserting a page', error);
        return err(Feedbacks.E_CREATING_PAGE);
      }
    },

    async createSession(
      session: SessionModel
    ): Promise<Result<void, Feedback>> {
      try {
        await this.db.put(session);
        return ok();
      } catch (error) {
        console.log('Error creating a session', error);
        return err(Feedbacks.E_CREATING_SESSION);
      }
    },

    async getSessionById(
      sessionId: string
    ): Promise<Result<SessionModel | null, Feedback>> {
      try {
        return ok(await this.db.get<SessionModel>(sessionId));
      } catch (error) {
        if ((error as PouchDB.Core.Error).status !== 404) {
          console.log('Error finding a session', error);
          return err(Feedbacks.E_UNKNOWN_ERROR);
        }
        return ok(null);
      }
    },

    async deleteSession(sessionId: string): Promise<Result<void, Feedback>> {
      const session = (await this.getSessionById(sessionId)).match(
        (session) => session,
        () => null
      );

      if (!session) {
        return ok();
      }

      try {
        // biome-ignore lint/style/noNonNullAssertion:
        await this.db.remove(session._id, session._rev!);
      } catch (error) {
        if ((error as PouchDB.Core.Error).status !== 404) {
          console.log('Error deleting a session', error);
          return err(Feedbacks.E_UNKNOWN_ERROR);
        }
      }

      return ok();
    },

    async getTopLevelPages(): Promise<Result<PageModel[], Feedback>> {
      try {
        const result = (await this.db.find({
          selector: {
            type: 'page',
            parentId: null,
            position: { $gte: 0 },
          },
          sort: [{ position: 'asc' }],
        })) as PouchDB.Find.FindResponse<PageModel>;

        return ok(result.docs);
      } catch (error) {
        console.error('Error getting top level pages:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

    async buildMenuTree(
      parentId: string | null = null
    ): Promise<Result<NavItem[], Feedback>> {
      try {
        const result = await this.db.find({
          selector: {
            type: 'page',
            // We're not filtering by parentId here, we'll organize in memory
          },
          fields: ['_id', 'pageTitle', 'pageSlug', 'position', 'parentId'],
          // No need to sort here, we'll sort in memory
          limit: Number.MAX_SAFE_INTEGER,
        });

        const pages = result.docs as PageModel[];

        // Group pages by parentId
        const pagesByParent = new Map<string | null, PageModel[]>();

        pages.forEach((page) => {
          const parentKey = page.parentId || null;
          if (!pagesByParent.has(parentKey)) {
            pagesByParent.set(parentKey, []);
          }
          // biome-ignore lint/style/noNonNullAssertion:
          pagesByParent.get(parentKey)!.push(page);
        });

        // Sort each group by position
        pagesByParent.forEach((group) => {
          group.sort((a, b) => (a.position || 0) - (b.position || 0));
        });

        // Recursive function to build tree structure
        const buildTree = (currentParentId: string | null): NavItem[] => {
          const children = pagesByParent.get(currentParentId) || [];

          return children.map((page) => ({
            pageId: page._id,
            title: page.pageTitle,
            link: slugUrl(page.pageSlug),
            position: page.position,
            children: buildTree(page._id),
          }));
        };

        // Build the tree starting from the requested parent
        return ok(buildTree(parentId));
      } catch (error) {
        console.error('Error building menu tree:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

    // async oldBuildMenuTree(parentId: string | null): Promise<NavItem[]> {
    //   const result = await this.db.find({
    //     selector: {
    //       type: 'page',
    //       parentId: parentId ?? null,
    //       position: { $gte: 0 },
    //     },
    //     fields: ['_id', 'pageTitle', 'pageSlug', 'position'],
    //     sort: [{ position: 'asc' }],
    //   });

    //   const menuTree = await Promise.all(
    //     (result.docs as PageModel[]).map(async (page) => {
    //       const menuItem: NavItem = {
    //         pageId: page._id,
    //         title: page.pageTitle,
    //         link: slugUrl(page.pageSlug),
    //         position: page.position,
    //         children: await this.buildMenuTree(page._id),
    //       };

    //       return menuItem;
    //     })
    //   );

    //   return menuTree;
    // },

    async updatePageContent(
      page: PageModel,
      newPage: Partial<PageModel>
    ): Promise<Result<void, Feedback>> {
      try {
        const updatedPage: PageModel = {
          ...page,
          ...newPage,
          contentUpdated: true,
          pageTitle: safeHtml(newPage.pageTitle ?? ''),
          pageContent: safeHtml(newPage.pageContent ?? ''),
          updatedAt: newPage.updatedAt ?? new Date().toISOString(),
        };

        if (page.pageSlug !== newPage.pageSlug) {
          updatedPage.pageSlugs = [...page.pageSlugs, page.pageSlug];
        }

        await this.db.put(updatedPage);
        return ok();
      } catch (error) {
        console.error('Error updating page content:', error);
        return err(Feedbacks.E_UPDATING_PAGE);
      }
    },

    async changePageParent(
      page: PageModel,
      newParentId: string | null,
      position: number
    ): Promise<Result<void, Feedback>> {
      try {
        const updatedPage: PageModel = {
          ...page,
          position,
          contentUpdated: false,
          parentId: newParentId,
        };

        await this.db.put(updatedPage);

        return ok();
      } catch (error) {
        console.error('Error changing page parent:', error);
        return err(Feedbacks.E_UPDATING_PAGE);
      }
    },

    async updatePagePosition(
      page: PageModel,
      position: number
    ): Promise<Result<void, Feedback>> {
      try {
        await this.db.put({
          ...page,
          contentUpdated: false,
          position,
        });
        return ok();
      } catch (error) {
        console.error('Error updating page position:', error);
        return err(Feedbacks.E_UPDATING_PAGE);
      }
    },

    async deletePage(page: PageModel): Promise<Result<void, Feedback>> {
      try {
        // First delete the page
        await this.db.remove(page as Required<PageModel>);

        // Find all child pages
        const result = (await this.db.find({
          selector: {
            type: 'page',
            parentId: page._id,
          },
        })) as PouchDB.Find.FindResponse<PageModel>;

        // Update each child page's parent
        for await (const childPage of result.docs) {
          this.db.put({
            ...childPage,
            parentId: page.parentId,
            contentUpdated: false,
          });
        }

        return ok();
      } catch (error) {
        console.error('Error deleting page:', error);
        return err(Feedbacks.E_DELETING_PAGE);
      }
    },

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

    async getPageHistory(
      page: PageModel
    ): Promise<Result<PageModel[], Feedback>> {
      try {
        const doc = await this.db.get(page._id, { revs_info: true });

        if (!doc._revs_info) {
          return ok([]);
        }

        const history = (
          await Promise.all(
            (doc._revs_info as PouchDB.Core.RevisionInfo[]).map(async (rev) => {
              if (rev.status !== 'available') return null;
              if (rev.rev === doc._rev) return null;
              const revisionDoc = (await this.db.get(page._id, {
                rev: rev.rev,
              })) as PageModel;
              if (!revisionDoc.contentUpdated) return null;
              return {
                pageTitle: revisionDoc.pageTitle,
                updatedAt: revisionDoc.updatedAt,
                _rev: revisionDoc._rev,
              };
            })
          )
        ).filter((item): item is Required<PageModel> => item !== null);

        return ok(history);
      } catch (error) {
        console.error('Error getting page history:', error);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
    },

    async getPageHistoryItem(
      page: PageModel,
      version: string
    ): Promise<Result<PageModel, Feedback>> {
      try {
        const revisionDoc = await this.db.get<PageModel>(page._id, {
          rev: version,
        });

        return ok({
          pageTitle: revisionDoc.pageTitle,
          pageContent: revisionDoc.pageContent,
          updatedAt: revisionDoc.updatedAt,
          _rev: revisionDoc._rev,
        } as PageModel);
      } catch (error) {
        console.error('Error getting page history item:', error);
        return err(Feedbacks.E_INVALID_VERSION);
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
