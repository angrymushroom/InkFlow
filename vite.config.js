import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "",
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
    host: true,
    strictPort: false,
  },
  plugins: [vue()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
  },
});
