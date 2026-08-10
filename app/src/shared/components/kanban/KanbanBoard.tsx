import { useMemo, useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ActivityResponse, ActivityStatus, MoveActivityRequest } from '@/core/api/types'
import { ActivityCard, STATUS_LABELS } from '@/shared/components/kanban/ActivityCard'
import { cn } from '@/shared/lib/cn'

export interface KanbanColumnDef {
  key: ActivityStatus
  label: string
  accent: string
  color?: string
}

interface KanbanBoardProps {
  columns: KanbanColumnDef[]
  items: ActivityResponse[]
  onMove: (activityId: string, data: MoveActivityRequest) => Promise<void>
  onOpen: (activityId: string) => void
  getMemberName: (membershipId: string) => string
  getProjectName: (projectId: string) => string
}

const columnId = (status: ActivityStatus) => `column:${status}`

function sortByPosition(items: ActivityResponse[]) {
  return items.slice().sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
}

export function calculatePosition(items: ActivityResponse[], index: number): number | undefined {
  const previous = index > 0 ? items[index - 1] : undefined
  const next = index < items.length ? items[index] : undefined
  if (!previous && !next) return undefined
  if (!previous) return next!.position - 1000
  if (!next) return previous.position + 1000
  const gap = next.position - previous.position
  return gap > 1 ? previous.position + Math.floor(gap / 2) : next.position - 1
}

export function KanbanBoard({ columns, items, onMove, onOpen, getMemberName, getProjectName }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const itemsByStatus = useMemo(() => Object.fromEntries(
    columns.map((column) => [column.key, sortByPosition(items.filter((item) => item.status === column.key))]),
  ) as Record<ActivityStatus, ActivityResponse[]>, [columns, items])
  const activeActivity = activeId ? items.find((item) => item.id === activeId) ?? null : null
  const statuses = columns.map((column) => column.key)

  const commitMove = (activityId: string, data: MoveActivityRequest) => {
    void onMove(activityId, data).catch(() => undefined)
  }

  const moveToEnd = (activity: ActivityResponse, status: ActivityStatus) => {
    const destination = itemsByStatus[status].filter((item) => item.id !== activity.id)
    commitMove(activity.id, {
      status,
      position: calculatePosition(destination, destination.length),
      expectedVersion: activity.version,
    })
  }

  const handleDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id))

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return
    const activity = items.find((item) => item.id === active.id)
    if (!activity) return

    const overId = String(over.id)
    const targetActivity = items.find((item) => item.id === overId)
    const targetStatus = targetActivity
      ? targetActivity.status
      : overId.startsWith('column:')
        ? overId.slice('column:'.length) as ActivityStatus
        : null
    if (!targetStatus) return

    const destination = itemsByStatus[targetStatus].filter((item) => item.id !== activity.id)
    let targetIndex = destination.length
    if (targetActivity) {
      targetIndex = destination.findIndex((item) => item.id === targetActivity.id)
      const translated = active.rect.current.translated
      if (translated && translated.top > over.rect.top + over.rect.height / 2) targetIndex += 1
    }

    const currentOrder = itemsByStatus[activity.status].map((item) => item.id)
    const nextOrder = destination.map((item) => item.id)
    nextOrder.splice(targetIndex, 0, activity.id)
    if (activity.status === targetStatus && currentOrder.every((id, index) => id === nextOrder[index])) return

    commitMove(activity.id, {
      status: targetStatus,
      position: calculatePosition(destination, targetIndex),
      expectedVersion: activity.version,
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Pressione espaço para selecionar. Use as setas para mover. Pressione espaço novamente para soltar ou Escape para cancelar.',
        },
        announcements: {
          onDragStart: ({ active }) => `Atividade ${active.data.current?.title ?? active.id} selecionada.`,
          onDragOver: ({ over }) => over ? `Posição de destino ${over.id}.` : 'Fora de uma coluna.',
          onDragEnd: ({ over }) => over ? `Atividade movida para ${over.id}.` : 'Movimentação cancelada.',
          onDragCancel: () => 'Movimentação cancelada.',
        },
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-2" aria-label="Quadro de atividades">
        {columns.map((column) => (
          <KanbanColumn
            key={column.key}
            column={column}
            items={itemsByStatus[column.key]}
            statuses={statuses}
            onOpen={onOpen}
            onMoveTo={(activity, status) => { void moveToEnd(activity, status) }}
            getMemberName={getMemberName}
            getProjectName={getProjectName}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeActivity ? (
          <div className="w-72 pointer-events-none">
            <ActivityCard
              activity={activeActivity}
              memberName={getMemberName(activeActivity.assignedTo)}
              projectName={getProjectName(activeActivity.projectId)}
              statuses={statuses}
              overlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

interface ColumnProps {
  column: KanbanColumnDef
  items: ActivityResponse[]
  statuses: ActivityStatus[]
  onOpen: (activityId: string) => void
  onMoveTo: (activity: ActivityResponse, status: ActivityStatus) => void
  getMemberName: (membershipId: string) => string
  getProjectName: (projectId: string) => string
}

function KanbanColumn({ column, items, statuses, onOpen, onMoveTo, getMemberName, getProjectName }: ColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: columnId(column.key),
    data: { type: 'column', status: column.key },
  })

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex w-72 min-w-72 shrink-0 flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-3 transition-colors motion-reduce:transition-none',
        isOver && 'border-primary/50 bg-primary/5',
      )}
      aria-labelledby={`kanban-${column.key}`}
    >
      <header className="flex items-center justify-between">
        <h2 id={`kanban-${column.key}`} className={cn('flex items-center gap-2 text-sm font-semibold', column.accent)}>
          <span className="size-2 rounded-full" style={{ backgroundColor: column.color ?? 'currentColor' }} aria-hidden="true" />
          {column.label}
        </h2>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </header>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-20 flex-col gap-2">
          {items.map((activity) => (
            <SortableActivityCard
              key={activity.id}
              activity={activity}
              statuses={statuses}
              onOpen={() => onOpen(activity.id)}
              onMoveTo={(status) => onMoveTo(activity, status)}
              memberName={getMemberName(activity.assignedTo)}
              projectName={getProjectName(activity.projectId)}
            />
          ))}
          {items.length === 0 && (
            <p className="rounded-lg border border-dashed border-border/50 px-3 py-8 text-center text-xs text-muted-foreground">
              Nenhuma atividade
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  )
}

interface SortableCardProps {
  activity: ActivityResponse
  memberName: string
  projectName: string
  statuses: ActivityStatus[]
  onOpen: () => void
  onMoveTo: (status: ActivityStatus) => void
}

function SortableActivityCard({ activity, memberName, projectName, statuses, onOpen, onMoveTo }: SortableCardProps) {
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    id: activity.id,
    data: { type: 'activity', status: activity.status, title: activity.title },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="touch-manipulation"
    >
      <ActivityCard
        activity={activity}
        memberName={memberName}
        projectName={projectName}
        statuses={statuses}
        onOpen={onOpen}
        onMoveTo={onMoveTo}
        dragHandleRef={setActivatorNodeRef}
        dragHandleProps={{ ...attributes, ...listeners }}
        dragging={isDragging}
      />
    </div>
  )
}
