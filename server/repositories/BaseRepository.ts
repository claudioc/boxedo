import type { AnyLogger, ConfigEnv, DocumentModel } from '~/../types';

export abstract class BaseRepository {
  constructor(
    protected db: PouchDB.Database<DocumentModel>,
    protected config: ConfigEnv,
    protected logger: AnyLogger
  ) {}
}
