import { computed } from 'vue'
import { useI18n as _useI18n } from 'vue-i18n'

const STORAGE_KEY = 'inkflow_locale'

/**
 * Thin wrapper around vue-i18n's useI18n.
 * Returns `t` as a computed ref so existing `t.value('key')` call sites
 * continue to work without changes.
 */
export function useI18n() {
  const { t: _t, locale } = _useI18n()

  // Wrap in computed so callers can use either t('key') or t.value('key')
  const t = computed(() => (key, params) => _t(key, params ?? {}))

  function setLocale(lang) {
    if (['en', 'zh', 'es', 'fr'].includes(lang)) {
      locale.value = lang
      try {
        localStorage.setItem(STORAGE_KEY, lang)
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang
      } catch (_) {}
    }
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale.value === 'zh' ? 'zh-CN' : locale.value
  }

  return { locale, t, setLocale }
}
