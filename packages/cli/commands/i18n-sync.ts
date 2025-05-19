import { promises as fs, type PathLike } from 'node:fs';
import { basename, join } from 'node:path';
import path from 'path';
import { Command } from '../lib/Command';

const localesDir = path.join(__dirname, '..', '..', 'core', 'locales');

export default class I18nSyncCommand extends Command {
  async run() {
    const enPath = join(localesDir, 'en.json');

    try {
      await fs.access(enPath);

      const languageFiles = await this.getLanguageFiles(localesDir);

      if (languageFiles.length === 0) {
        this.ui.console.info(
          'No language files found to compare with English.'
        );
        return;
      }

      for (const { path } of languageFiles) {
        await this.validateTranslations(enPath, path);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.ui.console.error('english translation file not found at', enPath);
      } else {
        this.ui.console.error('Error:', error.message);
      }
      process.exit(1);
    }
  }

  async loadTranslations(filepath: PathLike) {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  }

  getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
    return Object.entries(obj).reduce<string[]>((keys, [key, value]) => {
      const currentKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        return [...keys, ...this.getAllKeys(value, currentKey)];
      }
      return [...keys, currentKey];
    }, []);
  }

  compareTranslations(
    enKeys: string[],
    langKeys: string[]
  ): { missingKeys: string[]; extraKeys: string[] } {
    const missingKeys = enKeys.filter((key) => !langKeys.includes(key));
    const extraKeys = langKeys.filter((key) => !enKeys.includes(key));

    return { missingKeys, extraKeys };
  }

  async validateTranslations(enPath: string, langPath: string) {
    try {
      // Load both translation files
      const enTranslations = await this.loadTranslations(enPath);
      const langTranslations = await this.loadTranslations(langPath);

      // Get all nested keys from both translations
      const enKeys = this.getAllKeys(enTranslations).sort();
      const langKeys = this.getAllKeys(langTranslations).sort();

      // Compare the keys
      const { missingKeys, extraKeys } = this.compareTranslations(
        enKeys,
        langKeys
      );

      // Generate report
      const langName = basename(langPath, '.json');
      this.ui.console.info(`Validation Report for ${langName}:`);

      if (missingKeys.length === 0 && extraKeys.length === 0) {
        this.ui.console.info(
          '✅ Perfect match! All keys are present and accounted for.'
        );
        return true;
      }

      if (missingKeys.length > 0) {
        this.ui.console.info('❌ Missing keys:');
        missingKeys.forEach((key) => console.log(`   ${key}`));
      }

      if (extraKeys.length > 0) {
        this.ui.console.info('⚠️  Extra keys not in English version:');
        extraKeys.forEach((key) => console.log(`   ${key}`));
      }

      return false;
    } catch (error: any) {
      this.ui.console.error('Error during validation:', error.message);
      return false;
    }
  }

  async getLanguageFiles(directory: string) {
    const files = await fs.readdir(directory);
    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => ({
        path: join(directory, file),
        lang: basename(file, '.json'),
      }))
      .filter((file) => file.lang !== 'en'); // Exclude English file since it's our reference
  }
}

I18nSyncCommand.description =
  'Check if all the translation files are in sync in terms of presence of keys';
