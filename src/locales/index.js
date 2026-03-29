import en from './en.js'
import zh from './zh.js'
import es from './es.js'
import fr from './fr.js'

const messages = { en, zh, es, fr }

export const LOCALES = [
  { id: 'en', name: 'English' },
  { id: 'zh', name: '中文' },
  { id: 'es', name: 'Español' },
  { id: 'fr', name: 'Français' },
]

export function getMessage(locale, key, params) {
  const m = messages[locale] || messages.en
  const parts = key.split('.')
  let v = m
  for (const p of parts) {
    v = v?.[p]
    if (v === undefined) return messages.en ? getMessage('en', key, params) : key
  }
  let s = typeof v === 'string' ? v : key
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    s = s.replace(/\{(\w+)\}/g, (_, name) =>
      params.hasOwnProperty(name) ? String(params[name]) : `{${name}}`
    )
  }
  return s
}

export default messages
