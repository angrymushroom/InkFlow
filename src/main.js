import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/global.css'
import { initTheme } from './composables/useTheme.js'
initTheme()
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Expose Dexie instance for E2E tests (only in dev or when VITE_E2E=true)
if (import.meta.env.DEV || import.meta.env.VITE_E2E === 'true') {
  import('./db/index.js').then((m) => {
    window.__inkflow_db = m.db
  })
}
