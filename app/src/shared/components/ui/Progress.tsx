import { type HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  label?: string
  showPercentage?: boolean
}

function Progress({ className, value, label, showPercentage = false, ...props }: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="mb-1 flex items-center justify-between">
          {label && <span className="text-sm font-medium text-foreground">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-muted-foreground">{Math.round(clampedValue)}%</span>
          )}
        </div>
      )}
      <div
        className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        {...props}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}
Progress.displayName = 'Progress'

export { Progress }
