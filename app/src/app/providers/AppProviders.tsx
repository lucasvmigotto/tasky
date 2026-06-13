import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/core/errors/ErrorBoundary'
import { QueryProvider } from './QueryProvider'

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
