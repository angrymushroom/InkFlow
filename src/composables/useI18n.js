import { ref, computed } from 'vue';
import { getMessage } from '@/locales';

const STORAGE_KEY = 'inkflow_locale';

function getStored() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s && ['en', 'zh', 'es', 'fr'].includes(s)) return s;
  } catch (_) {}
  return 'en';
}

const locale = ref(getStored());

export function useI18n() {
  const t = computed(() => (key) => getMessage(locale.value, key));
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale.value === 'zh' ? 'zh-CN' : locale.value;
  }

  function setLocale(lang) {
    if (['en', 'zh', 'es', 'fr'].includes(lang)) {
      locale.value = lang;
      try {
        localStorage.setItem(STORAGE_KEY, lang);
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
      } catch (_) {}
    }
  }

  return { locale, t, setLocale };
}
