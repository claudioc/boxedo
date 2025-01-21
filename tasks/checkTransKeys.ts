// https://claude.site/artifacts/68957a31-1c37-45fb-a1b8-fbf5ca86f929

import fs from 'fs/promises';
import path from 'path';
import * as ts from 'typescript';

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

async function getAllTsxFiles(dir: string): Promise<string[]> {
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

function extractI18nKeys(sourceFile: ts.SourceFile): string[] {
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

function doesKeyExist(translations: TranslationObject, key: string): boolean {
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

async function validateTranslations(
  projectDir: string,
  translationsPath: string
) {
  // Load translations
  const translationsContent = await fs.readFile(translationsPath, 'utf-8');
  const translations = JSON.parse(translationsContent);

  // Get all TSX files
  const files = await getAllTsxFiles(projectDir);

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

    const keys = extractI18nKeys(sourceFile);

    for (const key of keys) {
      if (!doesKeyExist(translations, key)) {
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
    console.log('✅ All translation keys are valid!');
  } else {
    console.log('❌ Found missing translation keys:');
    for (const key of missingKeys) {
      console.log(`\nKey: ${key}`);
      console.log('Found in files:');
      fileOccurrences[key].forEach((file) => {
        console.log(`  - ${path.relative(projectDir, file)}`);
      });
    }
    process.exit(1);
  }
}

// Usage example
const projectDir = process.argv[2] || './server';
const translationsPath = process.argv[3] || './server/locales/en.json';

validateTranslations(projectDir, translationsPath).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
