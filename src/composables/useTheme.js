import { ref } from 'vue';

const STORAGE_KEY = 'inkflow_theme';

function getStored() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === 'light' || s === 'dark' || s === 'system') return s;
  } catch (_) {}
  return 'system';
}

export function applyTheme(value) {
  const root = document.documentElement;
  if (value === 'dark' || value === 'light' || value === 'system') {
    root.setAttribute('data-theme', value);
  }
}

// Apply saved theme immediately so the app doesn't flash (called from main.js and when user changes theme)
export function initTheme() {
  applyTheme(getStored());
}

const theme = ref(getStored());

export function useTheme() {
  function setTheme(value) {
    if (value !== 'light' && value !== 'dark' && value !== 'system') return;
    theme.value = value;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {}
    applyTheme(value);
  }

  return { theme, setTheme };
}
