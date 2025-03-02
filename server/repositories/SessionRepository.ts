import { err, ok, type Result } from 'neverthrow';
import type {
  AnyLogger,
  ConfigEnv,
  DocumentModel,
  Feedback,
  SessionModel,
} from '~/../types';
import { Feedbacks } from '~/lib/feedbacks';
import { BaseRepository } from './BaseRepository';

export class SessionRepository extends BaseRepository {
  constructor(
    protected db: PouchDB.Database<DocumentModel>,
    protected config: ConfigEnv,
    protected logger: AnyLogger
  ) {
    super(db, config, logger);
  }

  async createSession(session: SessionModel): Promise<Result<void, Feedback>> {
    try {
      await this.db.put(session);
      return ok();
    } catch (error) {
      console.log('Error creating a session', error);
      return err(Feedbacks.E_CREATING_SESSION);
    }
  }

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
  }

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
  }
}
