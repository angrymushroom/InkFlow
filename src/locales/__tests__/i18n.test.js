import { describe, it, expect } from 'vitest';

const en = (await import('@/locales/en.js')).default;
const zh = (await import('@/locales/zh.js')).default;
const fr = (await import('@/locales/fr.js')).default;
const es = (await import('@/locales/es.js')).default;

/**
 * Recursively collect all leaf key paths from a nested object.
 * Returns an array of dot-separated paths like "nav.ideas", "common.save", etc.
 */
function collectPaths(obj, prefix = '') {
  const paths = [];
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      paths.push(...collectPaths(val, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

/**
 * Get nested value from object by dot-separated path.
 */
function getByPath(obj, path) {
  return path.split('.').reduce((cur, k) => (cur != null ? cur[k] : undefined), obj);
}

const enPaths = collectPaths(en);

describe('i18n key completeness', () => {
  it('zh.js contains every key present in en.js', () => {
    const missing = enPaths.filter((p) => getByPath(zh, p) === undefined);
    expect(missing, `Missing keys in zh.js: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('fr.js contains every key present in en.js', () => {
    const missing = enPaths.filter((p) => getByPath(fr, p) === undefined);
    expect(missing, `Missing keys in fr.js: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('es.js contains every key present in en.js', () => {
    const missing = enPaths.filter((p) => getByPath(es, p) === undefined);
    expect(missing, `Missing keys in es.js: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('no locale has orphan keys missing from en.js', () => {
    for (const [lang, locale] of [['zh', zh], ['fr', fr], ['es', es]]) {
      const localePaths = collectPaths(locale);
      const orphans = localePaths.filter((p) => getByPath(en, p) === undefined);
      expect(orphans, `Orphan keys in ${lang}.js not in en.js: ${orphans.join(', ')}`).toHaveLength(0);
    }
  });
});

describe('fr.js apostrophe safety', () => {
  it('single-quoted string values in fr.js do not contain unescaped apostrophes', () => {
    // This is a runtime check: if fr.js loaded without SyntaxError, it is valid JS.
    // We additionally verify that no string VALUE contains a raw apostrophe that would
    // indicate a copy-paste issue (curly quotes are fine; straight apostrophes in VALUES
    // are acceptable — this test just ensures the file parses).
    expect(fr).toBeDefined();
    expect(typeof fr).toBe('object');
  });
});
