import { err, ok, type Result } from 'neverthrow';
import {
  DEFAULT_TEXT_SIZE,
  type AnyLogger,
  type ConfigEnv,
  type DocumentModel,
  type Feedback,
  type PreferencesModel,
} from '~/../types';
import { Feedbacks } from '~/lib/feedbacks';
import {
  ensureValidLanguage,
  generateIdFor,
  getDefaultLanguage,
} from '~/lib/helpers';
import { BaseRepository } from './BaseRepository';

const DEFAULT_PREFERENCES_VALUES: Partial<PreferencesModel> = {
  siteLang: getDefaultLanguage(undefined),
  textSize: DEFAULT_TEXT_SIZE,
};

const ensurePreferencesDefaults = (
  preferences: PreferencesModel
): PreferencesModel => ({
  ...DEFAULT_PREFERENCES_VALUES,
  ...preferences,
});

export class PreferencesRepository extends BaseRepository {
  constructor(
    protected db: PouchDB.Database<DocumentModel>,
    protected config: ConfigEnv,
    protected logger: AnyLogger
  ) {
    super(db, config, logger);
  }

  async getPreferencesByUserId(
    userId: string
  ): Promise<Result<PreferencesModel, Feedback>> {
    const preferencesId = generateIdFor('preferences', userId);
    try {
      const doc = await this.db.get<PreferencesModel>(preferencesId);
      return ok(ensurePreferencesDefaults(doc));
    } catch (error) {
      // No preferences yet for this user, just write them down the default
      if ((error as PouchDB.Core.Error).status === 404) {
        const preferences: PreferencesModel = {
          type: 'preferences',
          _id: preferencesId,
          siteLang: getDefaultLanguage(this.config),
          textSize: this.config
            ? this.config?.SETTINGS_TEXT_SIZE
            : DEFAULT_TEXT_SIZE,
        };

        try {
          await this.db.put<PreferencesModel>(preferences);
          return ok(await this.db.get<PreferencesModel>(preferencesId));
        } catch {}
      }

      this.logger.error(`Error getting the user preferences: ${error}`);
      return err(Feedbacks.E_UNKNOWN_ERROR);
    }
  }

  async updatePreferences(
    userId: string,
    preferences: PreferencesModel
  ): Promise<Result<void, Feedback>> {
    preferences.siteLang = ensureValidLanguage(preferences.siteLang);
    preferences._id = generateIdFor('preferences', userId);
    preferences.type = 'preferences';

    try {
      await this.db.put(preferences);
      return ok();
    } catch (error) {
      this.logger.error(`Error updating user preferences: ${error}`);
      return err(Feedbacks.E_UPDATING_PREFERENCES);
    }
  }
}
