import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/core/errors/ErrorBoundary'
import { initSentry } from '@/core/observability/sentry'
import { QueryProvider } from './QueryProvider'

initSentry()

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        {children}
        <Toaster position="top-right" richColors />
      </QueryProvider>
    </ErrorBoundary>
  )
}
