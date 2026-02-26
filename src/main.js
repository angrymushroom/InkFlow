import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./styles/global.css";
import { initTheme } from "./composables/useTheme.js";

initTheme();
createApp(App).use(router).mount("#app");
