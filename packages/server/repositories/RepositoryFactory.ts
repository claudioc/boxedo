import type {
  AnyLogger,
  ConfigEnv,
  Db,
  DocumentModel,
} from 'boxedo-core/types';
import type { UrlService } from '~/services/UrlService';
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
  urlService: UrlService;
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
    private logger: AnyLogger,
    private urlService: UrlService
  ) {
    const repoParams = [this.db, this.config, this.logger] as const;

    this.settingsRepository = new SettingsRepository(...repoParams);
    this.pageRepository = new PageRepository(
      ...([...repoParams, this.urlService] as const)
    );
    this.sessionRepository = new SessionRepository(...repoParams);
    this.fileRepository = new FileRepository(...repoParams);
    this.magicRepository = new MagicRepository(...repoParams);
    this.userRepository = new UserRepository(...repoParams);
    this.preferencesRepository = new PreferencesRepository(...repoParams);
  }

  static create(options: RepositoryFactoryOptions): RepositoryFactory {
    const { db, config, logger, urlService } = options;

    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory(
        db,
        config,
        logger,
        urlService
      );
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
