import type { AnyLogger, ConfigEnv, DocumentModel } from '~/../types';
import { SettingsRepository } from './SettingsRepository';

interface RepositoryFactoryOptions {
  db: PouchDB.Database<DocumentModel>;
  config: ConfigEnv;
  logger: AnyLogger;
}

export class RepositoryFactory {
  private static instance: RepositoryFactory;
  private settingsRepository: SettingsRepository;

  private constructor(
    private db: PouchDB.Database<DocumentModel>,
    private config: ConfigEnv,
    private logger: AnyLogger
  ) {
    this.settingsRepository = new SettingsRepository(
      this.db,
      this.config,
      this.logger
    );
  }

  static create(options: RepositoryFactoryOptions): RepositoryFactory {
    const { db, config, logger } = options;
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory(db, config, logger);
    }

    return RepositoryFactory.instance;
  }

  getSettingsRepository(): SettingsRepository {
    return this.settingsRepository;
  }
}
