import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'
import { setApiBaseUrl } from '@/core/api/apiClient'

beforeAll(() => {
  // apiClient uses relative /api URLs in browsers; tests need absolute ones.
  setApiBaseUrl('http://localhost')
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
