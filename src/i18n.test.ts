import { describe, expect, it } from 'vitest';
import { createTranslator, SUPPORTED_LANGUAGES } from './i18n';
import { EN_STRINGS } from './locales/en';

const localeModules = import.meta.glob('./locales/*.ts', { eager: true }) as Record<
  string,
  { default?: Record<string, string> }
>;
const englishKeys = new Set(Object.keys(EN_STRINGS));
const nonEnglishCatalogs = Object.entries(localeModules).filter(([path]) => !path.endsWith('/en.ts'));

describe('Bookmarks translations', () => {
  it('contains only Bookmarks app keys in every reused catalog', () => {
    expect(nonEnglishCatalogs).toHaveLength(SUPPORTED_LANGUAGES.length - 1);
    for (const [path, module] of nonEnglishCatalogs) {
      expect(module.default, path).toBeTruthy();
      for (const [key, value] of Object.entries(module.default!)) {
        expect(englishKeys.has(key), `${path}: ${key}`).toBe(true);
        expect(value, `${path}: ${key}`).not.toMatch(/feedback|Qortium Help/i);
      }
    }
  });

  it('reuses translated common actions and falls back to Bookmarks English copy', () => {
    const spanish = createTranslator('es');
    expect(spanish('action.cancel')).toBe('Cancelar');
    expect(spanish('action.save')).toBe('Guardar');
    expect(spanish('app.title')).toBe('Qortium Bookmarks');
    expect(spanish('empty.search')).toBe('No matching bookmarks');
  });
});
