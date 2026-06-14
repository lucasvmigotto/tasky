import { useMemo } from 'react'
import { motion } from 'motion/react'
import type { ActivityResponse } from '@/core/api/types'

interface GanttChartProps {
  activities: ActivityResponse[]
  dependencies: Array<{ id: string; parentActivityId: string; childActivityId: string }>
  onActivityClick?: (activityId: string) => void
  className?: string
}

function getDayIndex(date: Date, start: Date): number {
  return Math.floor((date.getTime() - start.getTime()) / 86400000)
}

const BAR_COLORS = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-lime-500',
]

export function GanttChart({ activities, dependencies, onActivityClick, className }: GanttChartProps) {
  const { timelineStart, timelineEnd, totalDays, dayLabels } = useMemo(() => {
    if (activities.length === 0) {
      const now = new Date()
      const start = new Date(now)
      start.setDate(start.getDate() - 1)
      const end = new Date(now)
      end.setDate(end.getDate() + 7)
      const days = Math.ceil((end.getTime() - start.getTime()) / 86400000)
      return {
        timelineStart: start,
        timelineEnd: end,
        totalDays: days,
        dayLabels: Array.from({ length: days }, (_, i) => {
          const d = new Date(start)
          d.setDate(start.getDate() + i)
          return `${d.getMonth() + 1}/${d.getDate()}`
        }),
      }
    }

    const starts = activities.map((a) => new Date(a.startDatetime).getTime())
    const ends = activities.map((a) => new Date(a.endDatetime).getTime())
    const minStart = new Date(Math.min(...starts))
    const maxEnd = new Date(Math.max(...ends))

    minStart.setDate(minStart.getDate() - 1)
    maxEnd.setDate(maxEnd.getDate() + 1)

    const days = Math.ceil((maxEnd.getTime() - minStart.getTime()) / 86400000) + 1
    const labels = Array.from({ length: days }, (_, i) => {
      const d = new Date(minStart)
      d.setDate(minStart.getDate() + i)
      return `${d.getMonth() + 1}/${d.getDate()}`
    })

    return { timelineStart: minStart, timelineEnd: maxEnd, totalDays: days, dayLabels: labels }
  }, [activities])

  const sortedActivities = useMemo(() => {
    return [...activities].sort(
      (a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
    )
  }, [activities])

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        No activities to display on the timeline.
      </div>
    )
  }

  const dayWidth = 40
  const labelWidth = 200

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: labelWidth + totalDays * dayWidth }}>
          {/* Header */}
          <div className="flex border-b border-border">
            <div className="sticky left-0 z-10 w-[200px] shrink-0 bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
              Activity
            </div>
            <div className="flex">
              {dayLabels.map((label, i) => (
                <div
                  key={i}
                  className="flex w-10 shrink-0 items-center justify-center border-r border-border py-2 text-[10px] text-muted-foreground last:border-r-0"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {sortedActivities.map((activity, idx) => {
            const startDate = new Date(activity.startDatetime)
            const endDate = new Date(activity.endDatetime)
            const startIdx = getDayIndex(startDate, timelineStart)
            const durationDays = Math.max(
              (endDate.getTime() - startDate.getTime()) / 86400000,
              0.3
            )
            const barStart = Math.max(startIdx, 0)
            const barWidth = Math.min(durationDays, totalDays - barStart)
            const color = BAR_COLORS[idx % BAR_COLORS.length]
            const parentDeps = dependencies.filter((d) => d.childActivityId === activity.id)

            return (
              <div key={activity.id} className="flex border-b border-border hover:bg-muted/20">
                <div
                  className="sticky left-0 z-10 flex w-[200px] shrink-0 cursor-pointer items-center bg-card px-3 py-2.5 hover:bg-muted/30"
                  onClick={() => onActivityClick?.(activity.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{activity.title}</p>
                    <p className="text-[10px] text-muted-foreground">W{activity.weight}</p>
                  </div>
                  {parentDeps.length > 0 && (
                    <span className="ml-1 size-2 shrink-0 rounded-full bg-amber-500" />
                  )}
                </div>
                <div className="relative flex">
                  {Array.from({ length: totalDays }).map((_, i) => (
                    <div
                      key={i}
                      className="w-10 shrink-0 border-r border-border/30 last:border-r-0"
                    />
                  ))}
                  {barStart >= 0 && barWidth > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: barWidth * dayWidth - 4 }}
                      className={`absolute top-2 h-5 cursor-pointer rounded-sm ${color} bg-opacity-80 hover:opacity-100`}
                      style={{ left: barStart * dayWidth + 2 }}
                      title={`${activity.title} — ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`}
                      onClick={() => onActivityClick?.(activity.id)}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
