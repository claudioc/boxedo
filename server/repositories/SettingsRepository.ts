import { err, ok, type Result } from 'neverthrow';
import {
  DEFAULT_TEXT_SIZE,
  type AnyLogger,
  type ConfigEnv,
  type DocumentModel,
  type Feedback,
  type SettingsModel,
} from '~/../types';
import { Feedbacks } from '~/lib/feedbacks';
import { ensureValidLanguage, getDefaultLanguage } from '~/lib/helpers';
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

      // Adds the future attributes
      if (!settings.textSize) {
        settings.textSize = DEFAULT_TEXT_SIZE;
        await this.db.put(settings);
      }
      // End future attributes

      return ok(settings);
    } catch (error) {
      if ((error as PouchDB.Core.Error)?.status === 404) {
        const newSettings: SettingsModel = {
          _id: 'settings',
          type: 'settings',
          landingPageId: null,
          siteTitle: this.config ? (this.config.SETTINGS_TITLE ?? '') : '',
          siteDescription: this.config
            ? (this.config.SETTINGS_DESCRIPTION ?? '')
            : '',
          siteLang: getDefaultLanguage(this.config),
          textSize: this.config
            ? this.config?.SETTINGS_TEXT_SIZE
            : DEFAULT_TEXT_SIZE,
        };

        try {
          await this.db.put(newSettings);
          return ok(await this.db.get<SettingsModel>('settings'));
        } catch {}
      }

      this.logger.error('Error getting settings', error);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  async updateSettings(
    settings: SettingsModel
  ): Promise<Result<void, Feedback>> {
    settings.siteLang = ensureValidLanguage(settings.siteLang);

    try {
      await this.db.put(settings);
      return ok();
    } catch (error) {
      console.error('Error updating settings:', error);
      return err(Feedbacks.E_UPDATING_SETTINGS);
    }
  }
}
