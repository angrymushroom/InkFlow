import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./styles/global.css";
import { initTheme } from "./composables/useTheme.js";

initTheme();
createApp(App).use(router).mount("#app");

// Expose Dexie instance for E2E tests (only in dev or when VITE_E2E=true)
if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
  import("./db/index.js").then((m) => { window.__inkflow_db = m.db; });
}
