import type { AnyLogger, ConfigEnv, Db, DocumentModel } from '~/../types';
import { FileRepository } from './FileRepository';
import { MagicRepository } from './MagicRepository';
import { PageRepository } from './PageRepository';
import { PreferencesRepository } from './PreferencesRepository';
import { SessionRepository } from './SessionRepository';
import { SettingsRepository } from './SettingsRepository';
import { UserRepository } from './UserRepository';

interface RepositoryFactoryOptions {
  db: PouchDB.Database<DocumentModel>;
  config: ConfigEnv;
  logger: AnyLogger;
}

export class RepositoryFactory {
  private static instance: RepositoryFactory;
  private settingsRepository: SettingsRepository;
  private pageRepository: PageRepository;
  private sessionRepository: SessionRepository;
  private fileRepository: FileRepository;
  private magicRepository: MagicRepository;
  private userRepository: UserRepository;
  private preferencesRepository: PreferencesRepository;

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
    this.sessionRepository = new SessionRepository(
      this.db,
      this.config,
      this.logger
    );
    this.fileRepository = new FileRepository(this.db, this.config, this.logger);
    this.magicRepository = new MagicRepository(
      this.db,
      this.config,
      this.logger
    );
    this.userRepository = new UserRepository(this.db, this.config, this.logger);
    this.preferencesRepository = new PreferencesRepository(
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

  getDb(): Db {
    return this.db;
  }

  getSettingsRepository(): SettingsRepository {
    return this.settingsRepository;
  }

  getPageRepository(): PageRepository {
    return this.pageRepository;
  }

  getSessionRepository(): SessionRepository {
    return this.sessionRepository;
  }

  getFileRepository(): FileRepository {
    return this.fileRepository;
  }

  getMagicRepository(): MagicRepository {
    return this.magicRepository;
  }

  getUserRepository(): UserRepository {
    return this.userRepository;
  }

  getPreferencesRepository(): PreferencesRepository {
    return this.preferencesRepository;
  }
}
