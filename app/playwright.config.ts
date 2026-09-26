import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    // Only for the backend-backed timer profile when the local mkcert CA
    // is not installed (`mkcert -install`): the mock-OIDC proxy serves a
    // locally-trusted cert that stock browsers reject.
    ignoreHTTPSErrors: process.env.E2E_INSECURE_TLS === 'true',
  },
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: 'bun run preview -- --port 5173 --strictPort',
        url: 'http://127.0.0.1:5173/',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
