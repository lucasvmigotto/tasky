import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="mt-2 flex items-center gap-2 sm:mt-0">{children}</div>}
    </div>
  )
}
PageHeader.displayName = 'PageHeader'

export { PageHeader }
