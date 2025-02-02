import en from './en.json';
import it from './it.json';

interface PhraseDefinition {
  language: string;
  name: string;
  phrases: Record<string, Record<string, string>>;
}

export const phraseDefinitions: PhraseDefinition[] = [
  {
    language: 'en',
    name: 'English',
    phrases: en,
  },
  {
    language: 'it',
    name: 'Italiano',
    phrases: it,
  },
] as const;

// Export the definitions as a simple object indexed by the language code
export const phrases = Object.fromEntries(
  phraseDefinitions.map(({ language, phrases }) => [language, phrases])
) as { [K in SupportedLocales]: Record<string, Record<string, string>> };

export const supportedLocales = phraseDefinitions.map((p) => p.language);
export type SupportedLocales = (typeof supportedLocales)[number];
