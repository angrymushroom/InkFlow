import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'VITE_E2E=true npm run build && npx vite preview --port 4173',
    port: 4173,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
