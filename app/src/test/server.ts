import { setupServer } from 'msw/node'
import { handlers } from '@/core/api/msw/handlers'

export const server = setupServer(...handlers)
