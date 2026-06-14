import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, ChevronRight, Link2, ArrowUpRight } from 'lucide-react'
import { Badge } from '@/shared/components/ui/Badge'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/components/ui/Tooltip'
import type { ActivityResponse } from '@/core/api/types'

interface DependencyTreeProps {
  activity: ActivityResponse
  allActivities: ActivityResponse[]
  dependencies: Array<{ id: string; parentActivityId: string; childActivityId: string }>
  onActivityClick?: (activityId: string) => void
  onAddDependency?: () => void
  onRemoveDependency?: (parentId: string) => void
}

function getActivityById(id: string, activities: ActivityResponse[]): ActivityResponse | undefined {
  return activities.find((a) => a.id === id)
}

function DependencyNode({
  activity,
  allActivities,
  onActivityClick,
  depth = 0,
}: {
  activity: ActivityResponse
  allActivities: ActivityResponse[]
  onActivityClick?: (id: string) => void
  depth?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="group relative"
    >
      <div className="flex items-center gap-2 rounded-lg border bg-card p-3 transition-all hover:border-primary/30">
        {depth > 0 && <div className="ml-4 border-l-2 border-border pl-4" />}
        <div className="flex size-2 shrink-0 rounded-full bg-primary" />
        <div className="flex-1 min-w-0">
          <button
            className="truncate text-sm font-medium hover:text-primary"
            onClick={() => onActivityClick?.(activity.id)}
          >
            {activity.title}
          </button>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-[10px]">
              W{activity.weight}
            </Badge>
            {activity.labelIds?.slice(0, 2).map((labelId) => (
              <Badge key={labelId} variant="outline" className="text-[10px]">
                {labelId.slice(0, 8)}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function DependencyTree({
  activity,
  allActivities,
  dependencies,
  onActivityClick,
  onAddDependency,
  onRemoveDependency,
}: DependencyTreeProps) {
  const [expanded, setExpanded] = useState(true)

  const parentDeps = useMemo(
    () => dependencies.filter((d) => d.childActivityId === activity.id),
    [dependencies, activity.id]
  )

  const childDeps = useMemo(
    () => dependencies.filter((d) => d.parentActivityId === activity.id),
    [dependencies, activity.id]
  )

  return (
    <Card>
      <CardContent className="p-4">
        <button
          className="flex items-center gap-2 text-sm font-medium mb-3"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          <Link2 className="size-4" />
          Dependencies ({parentDeps.length + childDeps.length})
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3"
            >
              {parentDeps.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Depends on</p>
                  <div className="space-y-2">
                    {parentDeps.map((dep) => {
                      const parent = getActivityById(dep.parentActivityId, allActivities)
                      if (!parent) return null
                      return (
                        <div key={dep.id} className="flex items-center gap-2">
                          <DependencyNode
                            activity={parent}
                            allActivities={allActivities}
                            onActivityClick={onActivityClick}
                            depth={1}
                          />
                          {onRemoveDependency && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 shrink-0 opacity-0 group-hover:opacity-100"
                              onClick={() => onRemoveDependency(dep.parentActivityId)}
                            >
                              <ArrowUpRight className="size-3" />
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {childDeps.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Blocks</p>
                  <div className="space-y-2">
                    {childDeps.map((dep) => {
                      const child = getActivityById(dep.childActivityId, allActivities)
                      if (!child) return null
                      return (
                        <DependencyNode
                          key={dep.id}
                          activity={child}
                          allActivities={allActivities}
                          onActivityClick={onActivityClick}
                          depth={0}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {parentDeps.length === 0 && childDeps.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No dependencies yet.
                </p>
              )}

              {onAddDependency && (
                <Button variant="outline" size="sm" className="w-full" onClick={onAddDependency}>
                  <Link2 className="mr-1.5 size-3.5" />
                  Add dependency
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
