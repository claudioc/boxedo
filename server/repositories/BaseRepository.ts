import type { AnyLogger, ConfigEnv, DocumentModel } from '~/../types';
import type { UrlService } from '~/services/UrlService';

export abstract class BaseRepository {
  constructor(
    protected db: PouchDB.Database<DocumentModel>,
    protected config: ConfigEnv,
    protected logger: AnyLogger,
    protected urlService?: UrlService
  ) {}
}
