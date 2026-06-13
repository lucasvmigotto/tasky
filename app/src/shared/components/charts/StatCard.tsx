import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { TrendingDown, TrendingUp, Minus, type LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export interface StatCardProps {
  value: number
  label: string
  trend?: 'up' | 'down' | 'flat'
  trendValue?: string
  icon?: LucideIcon
  formatValue?: (value: number) => string
  className?: string
  children?: ReactNode
}

function StatCard({
  value,
  label,
  trend,
  trendValue,
  icon: Icon,
  formatValue,
  className,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValue = useRef(0)

  useEffect(() => {
    prevValue.current = displayValue
  }, [displayValue])

  useEffect(() => {
    let animationFrame: number
    const duration = 800
    const startTime = performance.now()
    const startValue = prevValue.current
    const endValue = value

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(startValue + (endValue - startValue) * eased)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value])

  const formattedValue = formatValue ? formatValue(displayValue) : displayValue.toLocaleString()

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor =
    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'

  return (
    <motion.div
      className={cn(
        'rounded-lg border border-border bg-card p-6 shadow-sm',
        className,
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-foreground">{formattedValue}</p>
        {trend && trendValue && (
          <span className={cn('flex items-center gap-0.5 text-xs font-medium', trendColor)}>
            <TrendIcon className="size-3" />
            {trendValue}
          </span>
        )}
      </div>
    </motion.div>
  )
}
StatCard.displayName = 'StatCard'

export { StatCard }
