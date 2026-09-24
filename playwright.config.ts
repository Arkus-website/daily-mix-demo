import { defineConfig } from '@playwright/test';

// Expects a seeded database (`npm run db:seed`) and a production build (`npm run build`).
const port = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `npm run start -- -p ${port}`,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: !process.env.CI,
  },
});
