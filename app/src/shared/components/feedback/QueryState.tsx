import { Loader2 } from 'lucide-react'
import { EmptyState } from '@/shared/components/ui/EmptyState'

type QueryStateProps = {
  isLoading?: boolean
  error?: Error | null
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  children: React.ReactNode
}

export function QueryState({ isLoading, error, isEmpty, emptyTitle = 'Nada encontrado', emptyDescription, children }: QueryStateProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
      </div>
    )
  }
  if (error) {
    return <EmptyState title="Falha ao carregar" description={error.message} />
  }
  if (isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }
  return <>{children}</>
}
