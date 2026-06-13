import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import type { ButtonProps } from '@/shared/components/ui/Button'

export interface ChartCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  actionVariant?: ButtonProps['variant']
  children: ReactNode
}

function ChartCard({
  title,
  subtitle,
  actionLabel,
  onAction,
  actionVariant = 'ghost',
  children,
  className,
  ...props
}: ChartCardProps) {
  return (
    <Card className={cn('h-full', className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </div>
        {actionLabel && onAction && (
          <Button variant={actionVariant} size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
ChartCard.displayName = 'ChartCard'

export { ChartCard }
