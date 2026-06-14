import { AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'

export interface ErrorPageProps {
  message?: string
  onRetry?: () => void
}

function ErrorPage({ message = 'Something went wrong', onRetry }: ErrorPageProps) {
  return (
    <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center gap-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertCircle className="size-8 text-destructive" />
      </div>
      <p className="max-w-md text-center text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
ErrorPage.displayName = 'ErrorPage'

export { ErrorPage }
