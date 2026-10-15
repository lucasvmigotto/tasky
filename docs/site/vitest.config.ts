import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify('1.1.0'),
    __VERSIONS__: JSON.stringify([
      {
        name: 'app',
        version: '1.2.0',
        label: 'app@v1.2.0',
        href: 'https://github.com/lucasvmigotto/tasky/tree/app-1.2.0',
      },
      {
        name: 'api',
        version: '1.2.0',
        label: 'api@v1.2.0',
        href: 'https://github.com/lucasvmigotto/tasky/tree/api-1.2.0',
      },
      {
        name: 'docs',
        version: '1.0.0',
        label: 'docs@v1.0.0',
        href: 'https://github.com/lucasvmigotto/tasky/tree/app-1.2.0/docs/site',
      },
    ]),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
