import { getMessage } from '@/locales';

const STORAGE_KEY = 'inkflow_locale';

function getStoredLocale() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s && ['en', 'zh', 'es', 'fr'].includes(s)) return s;
  } catch (_) {}
  return 'en';
}

export function getUnsavedMessage() {
  const locale = getStoredLocale();
  return getMessage(locale, 'common.unsavedLeave');
}
