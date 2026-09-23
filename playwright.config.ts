import { defineConfig } from '@playwright/test';

// Expects a seeded database (`npm run db:seed`) and a production build (`npm run build`).
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
  },
});
