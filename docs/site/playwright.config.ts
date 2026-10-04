import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    // Served under the docs-hub prefix (vite `base: '/tasky/'`).
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4173/tasky/',
    trace: 'on-first-retry',
  },
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: 'bun run preview',
        url: 'http://localhost:4173/tasky/',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
