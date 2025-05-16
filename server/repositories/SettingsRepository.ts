import { err, ok, type Result } from 'neverthrow';
import type {
  AnyLogger,
  ConfigEnv,
  DocumentModel,
  Feedback,
  SettingsModel,
} from '~/../types';
import { Feedbacks } from '~/lib/feedbacks';
import { BaseRepository } from './BaseRepository';

export class SettingsRepository extends BaseRepository {
  constructor(
    protected db: PouchDB.Database<DocumentModel>,
    protected config: ConfigEnv,
    protected logger: AnyLogger
  ) {
    super(db, config, logger);
  }

  async getSettings(): Promise<Result<SettingsModel, Feedback>> {
    try {
      const settings = await this.db.get<SettingsModel>('settings');
      return ok(settings);
    } catch (error) {
      if ((error as PouchDB.Core.Error)?.status === 404) {
        const newSettings: SettingsModel = {
          _id: 'settings',
          type: 'settings',
          landingPageId: null,
          siteTitle: this.config ? (this.config.BXD_SETTINGS_TITLE ?? '') : '',
          siteDescription: this.config
            ? (this.config.BXD_SETTINGS_DESCRIPTION ?? '')
            : '',
        };

        try {
          await this.db.put(newSettings);
          return ok(await this.db.get<SettingsModel>('settings'));
        } catch {}
      }

      this.logger.error(`Error getting settings: ${error}`);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  async updateSettings(
    settings: SettingsModel
  ): Promise<Result<void, Feedback>> {
    settings.type = 'settings';
    settings._id = 'settings';
    try {
      await this.db.put(settings);
      return ok();
    } catch (error) {
      this.logger.error(`Error updating settings: ${error}`);
      return err(Feedbacks.E_UPDATING_SETTINGS);
    }
  }
}
