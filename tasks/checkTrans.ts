import { promises as fs } from 'node:fs';
import { basename, join } from 'node:path';

const localesDir = './server/locales';

async function loadTranslations(filepath) {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
}

function getAllKeys(obj, prefix = '') {
    return Object.entries(obj).reduce((keys, [key, value]) => {
        const currentKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
            return [...keys, ...getAllKeys(value, currentKey)];
        }
        return [...keys, currentKey];
    }, []);
}

function compareTranslations(enKeys, langKeys) {
    const missingKeys = enKeys.filter(key => !langKeys.includes(key));
    const extraKeys = langKeys.filter(key => !enKeys.includes(key));

    return { missingKeys, extraKeys };
}

async function validateTranslations(enPath, langPath) {
    try {
        // Load both translation files
        const enTranslations = await loadTranslations(enPath);
        const langTranslations = await loadTranslations(langPath);

        // Get all nested keys from both translations
        const enKeys = getAllKeys(enTranslations).sort();
        const langKeys = getAllKeys(langTranslations).sort();

        // Compare the keys
        const { missingKeys, extraKeys } = compareTranslations(enKeys, langKeys);

        // Generate report
        const langName = basename(langPath, '.json');
        console.log(`\nValidation Report for ${langName}:`);

        if (missingKeys.length === 0 && extraKeys.length === 0) {
            console.log('✅ Perfect match! All keys are present and accounted for.');
            return true;
        }

        if (missingKeys.length > 0) {
            console.log('\n❌ Missing keys:');
            missingKeys.forEach(key => console.log(`   ${key}`));
        }

        if (extraKeys.length > 0) {
            console.log('\n⚠️  Extra keys not in English version:');
            extraKeys.forEach(key => console.log(`   ${key}`));
        }

        return false;
    } catch (error) {
        console.error('Error during validation:', error.message);
        return false;
    }
}

async function getLanguageFiles(directory) {
    const files = await fs.readdir(directory);
    return files
        .filter(file => file.endsWith('.json'))
        .map(file => ({
            path: join(directory, file),
            lang: basename(file, '.json')
        }))
        .filter(file => file.lang !== 'en'); // Exclude English file since it's our reference
}

const main = async () => {
    const enPath = join(localesDir, 'en.json');

    console.log('Starting translation validation...');

    try {
        // First check if English file exists
        await fs.access(enPath);

        // Get all other language files
        const languageFiles = await getLanguageFiles(localesDir);

        if (languageFiles.length === 0) {
            console.log('No language files found to compare with English.');
            return;
        }

        // Validate each language
        for (const { path, lang } of languageFiles) {
            await validateTranslations(enPath, path);
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error('Error: English translation file not found at', enPath);
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
};

// Run the validator
main().catch(console.error);
