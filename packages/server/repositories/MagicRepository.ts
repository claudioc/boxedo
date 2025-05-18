import { generateIdFor } from 'boxedo-core';
import type {
  AnyLogger,
  ConfigEnv,
  DocumentModel,
  Feedback,
  MagicModel,
} from 'boxedo-core/types';
import { err, ok, type Result } from 'neverthrow';
import { Feedbacks } from '~/lib/feedbacks';
import { BaseRepository } from './BaseRepository';

export class MagicRepository extends BaseRepository {
  constructor(
    protected db: PouchDB.Database<DocumentModel>,
    protected config: ConfigEnv,
    protected logger: AnyLogger
  ) {
    super(db, config, logger);
  }

  async createMagic(
    email: string,
    ttlMinutes: number
  ): Promise<Result<MagicModel, Feedback>> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60000);

    const data: MagicModel = {
      _id: generateIdFor('magic'),
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
      this.logger.error(`Error creating magic link: ${error}`);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

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
      this.logger.error(`Error validating magic link: ${error}`);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }
}
