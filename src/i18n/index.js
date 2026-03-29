import { createI18n } from 'vue-i18n'
import en from '@/locales/en.js'
import zh from '@/locales/zh.js'
import fr from '@/locales/fr.js'
import es from '@/locales/es.js'

const STORAGE_KEY = 'inkflow_locale'
const saved = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
})()
const locale = ['en', 'zh', 'fr', 'es'].includes(saved) ? saved : 'en'

export const i18n = createI18n({
  legacy: false,
  locale,
  fallbackLocale: 'en',
  messages: { en, zh, fr, es },
  missingWarn: false,
  fallbackWarn: false,
})
