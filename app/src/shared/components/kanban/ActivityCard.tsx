import type { ButtonHTMLAttributes } from 'react'
import { CalendarClock, CheckSquare, GripVertical, User } from 'lucide-react'
import type { ActivityPriority, ActivityResponse, ActivityStatus, ActivityTaskType } from '@/core/api/types'
import { cn } from '@/shared/lib/cn'
import { formatDate } from '@/shared/lib/formatters'

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  TODO: 'A Fazer',
  IN_PROGRESS: 'Em Andamento',
  DONE: 'Concluído',
  BLOCKED: 'Bloqueado',
  CANCELED: 'Cancelado',
}

export const PRIORITY_LABELS: Record<ActivityPriority, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export const TASK_TYPE_LABELS: Record<ActivityTaskType, string> = {
  TASK: 'Tarefa',
  BUG: 'Bug',
  IMPROVEMENT: 'Melhoria',
  SUPPORT: 'Suporte',
  MEETING: 'Reunião',
  MILESTONE: 'Marco',
}

const PRIORITY_STYLES: Record<ActivityPriority, string> = {
  LOW: 'text-slate-400',
  NORMAL: 'text-sky-500',
  HIGH: 'text-amber-500',
  URGENT: 'text-red-500',
}

const TASK_TYPE_STYLES: Record<ActivityTaskType, string> = {
  TASK: 'border-sky-500/20 bg-sky-500/10 text-sky-500',
  BUG: 'border-red-500/20 bg-red-500/10 text-red-400',
  IMPROVEMENT: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  SUPPORT: 'border-violet-500/20 bg-violet-500/10 text-violet-400',
  MEETING: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  MILESTONE: 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400',
}

interface ActivityCardProps {
  activity: ActivityResponse
  memberName: string
  projectName: string
  statuses: ActivityStatus[]
  onOpen?: () => void
  onMoveTo?: (status: ActivityStatus) => void
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>
  dragHandleRef?: (element: HTMLButtonElement | null) => void
  dragging?: boolean
  overlay?: boolean
}

export function ActivityCard({
  activity,
  memberName,
  projectName,
  statuses,
  onOpen,
  onMoveTo,
  dragHandleProps,
  dragHandleRef,
  dragging = false,
  overlay = false,
}: ActivityCardProps) {
  const checklistProgress = activity.checklistTotal > 0
    ? Math.round((activity.checklistCompleted / activity.checklistTotal) * 100)
    : null
  const overdue = Boolean(
    activity.dueDate &&
    activity.status !== 'DONE' &&
    activity.status !== 'CANCELED' &&
    new Date(activity.dueDate).getTime() < Date.now(),
  )

  return (
    <article
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-3 text-left shadow-sm transition-[border-color,box-shadow,opacity] motion-reduce:transition-none',
        !overlay && 'hover:border-primary/30 hover:shadow-md',
        dragging && 'opacity-40',
        overlay && 'rotate-1 border-primary/40 shadow-xl ring-2 ring-primary/20',
      )}
      aria-label={`${activity.title}, ${STATUS_LABELS[activity.status]}`}
    >
      <div className="flex items-start gap-2">
        {!overlay && (
          <button
            type="button"
            ref={dragHandleRef}
            className="-ml-1 shrink-0 touch-none rounded p-1 text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label={`Mover ${activity.title}`}
            {...dragHandleProps}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground hover:text-primary disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {activity.title}
        </button>
        <span
          className={cn('shrink-0', PRIORITY_STYLES[activity.priority])}
          title={`Prioridade ${PRIORITY_LABELS[activity.priority]}`}
          aria-label={`Prioridade ${PRIORITY_LABELS[activity.priority]}`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden="true">
            <path d="M4 4h16v3H4zM7 10h10v3H7zM10 16h4v3h-4z" />
          </svg>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-medium', TASK_TYPE_STYLES[activity.taskType])}>
          {TASK_TYPE_LABELS[activity.taskType]}
        </span>
        {activity.parentActivityId && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Subtarefa</span>
        )}
      </div>

      {checklistProgress !== null && (
        <div className="flex items-center gap-1.5">
          <CheckSquare className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label={`Checklist: ${activity.checklistCompleted} de ${activity.checklistTotal}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={checklistProgress}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${checklistProgress}%` }} />
          </div>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {activity.checklistCompleted}/{activity.checklistTotal}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1 truncate" title={memberName}>
          <User className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{memberName}</span>
        </span>
        <span className="max-w-24 truncate" title={projectName}>{projectName}</span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2">
        <span className={cn('inline-flex items-center gap-1 text-[11px]', overdue ? 'font-medium text-red-500' : 'text-muted-foreground')}>
          {activity.dueDate && <CalendarClock className="size-3" aria-hidden="true" />}
          {activity.dueDate ? formatDate(activity.dueDate) : 'Sem prazo'}
        </span>
        <div className="flex items-center gap-1">
          <span className="inline-flex size-5 items-center justify-center rounded-md border text-[10px] font-semibold text-muted-foreground" title={`Peso ${activity.weight}`}>
            {activity.weight}
          </span>
          {!overlay && (
            <label className="relative">
              <span className="sr-only">Mover {activity.title} para</span>
              <select
                value=""
                onChange={(event) => onMoveTo?.(event.target.value as ActivityStatus)}
                className="h-6 rounded-md border border-border/60 bg-card px-1 text-[10px] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label={`Mover ${activity.title} para outra coluna`}
              >
                <option value="" disabled>Mover para</option>
                {statuses.filter((status) => status !== activity.status).map((status) => (
                  <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
    </article>
  )
}
