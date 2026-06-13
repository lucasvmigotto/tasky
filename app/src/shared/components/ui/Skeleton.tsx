import { type HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}
Skeleton.displayName = 'Skeleton'

export { Skeleton }
