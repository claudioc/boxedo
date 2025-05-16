import { err, ok, type Result } from 'neverthrow';
import type {
  AnyLogger,
  ConfigEnv,
  DocumentModel,
  Feedback,
  FileAttachmentModel,
  FileModel,
  PageModel,
} from '~/../types';
import { Feedbacks } from '~/lib/feedbacks';
import { extractFileRefsFrom } from '~/lib/helpers';
import { BaseRepository } from './BaseRepository';

const streamToBuffer = async (
  stream: NodeJS.ReadableStream
): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export class FileRepository extends BaseRepository {
  constructor(
    protected db: PouchDB.Database<DocumentModel>,
    protected config: ConfigEnv,
    protected logger: AnyLogger
  ) {
    super(db, config, logger);
  }

  async insertFile(
    file: FileModel
  ): Promise<Result<PouchDB.Core.Response, Feedback>> {
    try {
      return ok(await this.db.put(file));
    } catch (error) {
      this.logger.error(`Error inserting a file: ${error}`);
      return err(Feedbacks.E_CREATING_FILE);
    }
  }

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
      this.logger.error(`Error inserting a file attachment: ${error}`);
      return err(Feedbacks.E_CREATING_ATTACHMENT);
    }
  }

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

      const deleteOps: PouchDB.Core.PutDocument<FileModel>[] = unusedFiles.map(
        (file) => ({
          ...file,
          _deleted: true,
        })
      );

      // Delete in batches of 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < deleteOps.length; i += BATCH_SIZE) {
        const batch = deleteOps.slice(i, i + BATCH_SIZE);
        await this.db.bulkDocs(batch);
      }

      return ok(unusedFiles.length);
    } catch (error) {
      this.logger.error(`Error cleaning up orphaned files: ${error}`);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  async getFileById(
    fileId: string
  ): Promise<Result<FileModel | null, Feedback>> {
    try {
      return ok(await this.db.get(fileId));
    } catch (error) {
      if ((error as PouchDB.Core.Error)?.status !== 404) {
        this.logger.error(`Error getting a file by id: ${err}`);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
      return ok(null);
    }
  }

  async getFileAttachment(
    fileId: string,
    attachmentName: string
  ): Promise<Result<Blob | Buffer<ArrayBufferLike> | null, Feedback>> {
    try {
      return ok(await this.db.getAttachment(fileId, attachmentName));
    } catch (error) {
      if ((error as PouchDB.Core.Error).status !== 404) {
        this.logger.error(`Error getting a attachment by id: ${error}`);
        return err(Feedbacks.E_UNKNOWN_ERROR);
      }
      return ok(null);
    }
  }
}
