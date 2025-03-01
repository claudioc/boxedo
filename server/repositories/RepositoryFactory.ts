import type { AnyLogger, ConfigEnv, Db, DocumentModel } from '~/../types';
import { PageRepository } from './PageRepository';
import { SettingsRepository } from './SettingsRepository';

interface RepositoryFactoryOptions {
  db: PouchDB.Database<DocumentModel>;
  config: ConfigEnv;
  logger: AnyLogger;
}

export class RepositoryFactory {
  private static instance: RepositoryFactory;
  private settingsRepository: SettingsRepository;
  private pageRepository: PageRepository;

  private constructor(
    private db: Db,
    private config: ConfigEnv,
    private logger: AnyLogger
  ) {
    this.settingsRepository = new SettingsRepository(
      this.db,
      this.config,
      this.logger
    );
    this.pageRepository = new PageRepository(this.db, this.config, this.logger);
  }

  static create(options: RepositoryFactoryOptions): RepositoryFactory {
    const { db, config, logger } = options;
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory(db, config, logger);
    }

    return RepositoryFactory.instance;
  }

  getDb(): Db {
    return this.db;
  }

  getSettingsRepository(): SettingsRepository {
    return this.settingsRepository;
  }

  getPageRepository(): PageRepository {
    return this.pageRepository;
  }
}
