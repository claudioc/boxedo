import fs from 'fs/promises';
import path from 'path';
import * as ts from 'typescript';
import { Command } from '../lib/Command';

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

export default class I18nCheckCommand extends Command {
  async run() {
    const projectDir = './server';
    const translationsPath = './server/locales/en.json';

    try {
      await this.validateTranslations(projectDir, translationsPath);
    } catch (error: any) {
      this.ui.console.error('Error:', error);
      process.exit(1);
    }
  }

  async getAllTsxFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(directory: string) {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('node_modules')) {
          await scan(fullPath);
        } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }

    await scan(dir);
    return files;
  }

  extractI18nKeys(sourceFile: ts.SourceFile): string[] {
    const keys: string[] = [];

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        // Match patterns like i18n.t('key') or t('key')
        const callText = node.expression.getText(sourceFile);
        if (callText === 'i18n.t' || callText === 't') {
          const args = node.arguments;
          if (args.length > 0 && ts.isStringLiteral(args[0])) {
            keys.push(args[0].text);
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return keys;
  }

  doesKeyExist(translations: TranslationObject, key: string): boolean {
    const parts = key.split('.');
    let current: TranslationObject | string = translations;

    for (const part of parts) {
      if (typeof current !== 'object' || current === null) {
        return false;
      }
      if (!(part in current)) {
        return false;
      }
      current = current[part];
    }

    return true;
  }

  async validateTranslations(projectDir: string, translationsPath: string) {
    // Load translations
    const translationsContent = await fs.readFile(translationsPath, 'utf-8');
    const translations = JSON.parse(translationsContent);

    // Get all TSX files
    const files = await this.getAllTsxFiles(projectDir);

    const missingKeys = new Set<string>();
    const fileOccurrences: { [key: string]: string[] } = {};

    // Process each file
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const sourceFile = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const keys = this.extractI18nKeys(sourceFile);

      for (const key of keys) {
        if (!this.doesKeyExist(translations, key)) {
          missingKeys.add(key);
          if (!fileOccurrences[key]) {
            fileOccurrences[key] = [];
          }
          fileOccurrences[key].push(file);
        }
      }
    }

    // Report results
    if (missingKeys.size === 0) {
      this.ui.console.info('✅ All translation keys are valid!');
    } else {
      this.ui.console.info('❌ Found missing translation keys:');
      for (const key of missingKeys) {
        this.ui.console.info(`Key: ${key}`);
        this.ui.console.info('Found in files:');
        fileOccurrences[key].forEach((file) => {
          console.log(`  - ${path.relative(projectDir, file)}`);
        });
      }
      process.exit(1);
    }
  }
}

I18nCheckCommand.description =
  'Check if all the translation key used are also part of the translation json files';
