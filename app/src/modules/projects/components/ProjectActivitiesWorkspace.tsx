import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarClock, ChartGantt, CheckSquare, Columns3, List, Plus, Search, Settings2, User } from 'lucide-react'
import { toast } from 'sonner'
import { useMoveActivity, useProjectColumns, useCreateProjectColumn, useUpdateProjectColumn, useDeleteProjectColumn, useReorderProjectColumns } from '@/core/api/hooks'
import type { ActivityResponse, ActivityStatus, MembershipResponse, ProjectColumn, ProjectResponse, UUID } from '@/core/api/types'
import { ROUTES, buildRoute } from '@/core/config/routes'
import { GanttChart } from '@/shared/components/activities/GanttChart'
import { PRIORITY_LABELS, STATUS_LABELS, TASK_TYPE_LABELS } from '@/shared/components/kanban/ActivityCard'
import { KanbanBoard, type KanbanColumnDef } from '@/shared/components/kanban/KanbanBoard'
import { QueryState } from '@/shared/components/feedback/QueryState'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { DataTable } from '@/shared/components/ui/DataTable'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/shared/components/ui/Dialog'
import { formatDate } from '@/shared/lib/formatters'

type WorkspaceView = 'list' | 'board' | 'timeline'

const VIEWS: WorkspaceView[] = ['list', 'board', 'timeline']
const DEFAULT_COLUMNS: KanbanColumnDef[] = [
  { key: 'TODO', label: STATUS_LABELS.TODO, accent: 'text-sky-400' },
  { key: 'IN_PROGRESS', label: STATUS_LABELS.IN_PROGRESS, accent: 'text-amber-400' },
  { key: 'IN_TESTING', label: STATUS_LABELS.IN_TESTING, accent: 'text-violet-400' },
  { key: 'BLOCKED', label: STATUS_LABELS.BLOCKED, accent: 'text-red-400' },
  { key: 'DONE', label: STATUS_LABELS.DONE, accent: 'text-emerald-400' },
  { key: 'CANCELED', label: STATUS_LABELS.CANCELED, accent: 'text-muted-foreground' },
]

const STATUS_OPTIONS: ActivityStatus[] = ['TODO', 'IN_PROGRESS', 'IN_TESTING', 'BLOCKED', 'DONE', 'CANCELED']

interface ProjectActivitiesWorkspaceProps {
  project: ProjectResponse
  activities: ActivityResponse[]
  members: MembershipResponse[]
  isLoading: boolean
  error: Error | null
}

export function ProjectActivitiesWorkspace({ project, activities, members, isLoading, error }: ProjectActivitiesWorkspaceProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get('view') as WorkspaceView | null
  const view = requestedView && VIEWS.includes(requestedView) ? requestedView : 'list'
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ActivityStatus | 'ALL'>('ALL')
  const [assignee, setAssignee] = useState('ALL')
  const moveActivity = useMoveActivity()

  const { data: columns = [] } = useProjectColumns(project.id)

  const boardColumns: KanbanColumnDef[] = useMemo(() => {
    if (columns.length > 0) {
      return columns.map((column) => ({
        key: column.lifecycleStatus,
        label: column.name,
        accent: 'text-foreground',
        color: column.color,
      }))
    }
    return DEFAULT_COLUMNS
  }, [columns])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return activities
      .filter((activity) => !query || activity.title.toLocaleLowerCase('pt-BR').includes(query))
      .filter((activity) => status === 'ALL' || activity.status === status)
      .filter((activity) => assignee === 'ALL' || (activity.assigneeIds ?? []).includes(assignee))
      .sort((a, b) => a.status.localeCompare(b.status) || a.position - b.position || a.startDatetime.localeCompare(b.startDatetime))
  }, [activities, assignee, search, status])

  const dependencies = useMemo(() => activities.flatMap((activity) => activity.parentIds.map((parentId) => ({
    id: `${activity.id}-${parentId}`,
    parentActivityId: parentId,
    childActivityId: activity.id,
  }))), [activities])

  const getMemberName = (membershipId: string) => {
    const member = members.find((candidate) => candidate.id === membershipId)
    return member?.customUsername || member?.username || 'Sem responsável'
  }
  const openActivity = (activityId: string) => navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId }))
  const changeView = (nextView: WorkspaceView) => {
    const next = new URLSearchParams(searchParams)
    next.set('view', nextView)
    setSearchParams(next, { replace: true })
  }
  const moveTo = async (activityId: string, data: { status?: ActivityStatus; position?: number; expectedVersion?: number }) => {
    try {
      const column = columns.find((candidate) => candidate.lifecycleStatus === data.status)
      const payload = column
        ? { columnId: column.id, position: data.position, expectedVersion: data.expectedVersion }
        : { status: data.status, position: data.position, expectedVersion: data.expectedVersion }
      await moveActivity.mutateAsync({ activityId: activityId as UUID, data: payload })
      toast.success(`Atividade movida para ${column?.name ?? STATUS_LABELS[data.status ?? 'TODO']}`)
    } catch (cause: any) {
      toast.error(cause?.message || 'Não foi possível mover a atividade')
      throw cause
    }
  }

  return (
    <section aria-labelledby="project-workspace-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 id="project-workspace-title" className="text-base font-semibold">Trabalho do projeto</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} de {activities.length} atividades visíveis</p>
          </div>
          <div className="flex w-full items-center gap-2 overflow-x-auto lg:w-auto">
            <div className="flex rounded-lg border bg-muted/30 p-1" aria-label="Visualização do projeto">
              <ViewButton active={view === 'list'} onClick={() => changeView('list')} icon={List}>Lista</ViewButton>
              <ViewButton active={view === 'board'} onClick={() => changeView('board')} icon={Columns3}>Quadro</ViewButton>
              <ViewButton active={view === 'timeline'} onClick={() => changeView('timeline')} icon={ChartGantt}>Timeline</ViewButton>
            </div>
            <ColumnsManagerDialog projectId={project.id} columns={columns} />
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={() => navigate(`${ROUTES.ACTIVITIES}?projectId=${project.id}&new=1`)}
            >
              <Plus className="size-4" aria-hidden="true" />
              Nova atividade
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_12rem_14rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Buscar atividades"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título..."
              className="pl-9"
            />
          </div>
          <Select
            aria-label="Filtrar por status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ActivityStatus | 'ALL')}
            options={[
              { value: 'ALL', label: 'Todos os status' },
              ...boardColumns.map((column) => ({ value: column.key, label: column.label })),
            ]}
          />
          <Select
            aria-label="Filtrar por responsável"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            options={[
              { value: 'ALL', label: 'Todos os responsáveis' },
              ...members.map((member) => ({ value: member.id, label: member.customUsername || member.username })),
            ]}
          />
        </div>
      </div>

      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={filtered.length === 0}
        emptyTitle={activities.length === 0 ? 'Projeto sem atividades' : 'Nenhuma atividade encontrada'}
        emptyDescription={activities.length === 0 ? 'Crie a primeira atividade para iniciar o planejamento.' : 'Altere ou limpe os filtros aplicados.'}
      >
        {view === 'board' ? (
          <KanbanBoard
            columns={boardColumns}
            items={filtered}
            onMove={moveTo}
            onOpen={openActivity}
            getMemberName={getMemberName}
            getProjectName={() => project.name}
          />
        ) : view === 'timeline' ? (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            <GanttChart activities={filtered} dependencies={dependencies} onActivityClick={openActivity} />
          </div>
        ) : (
          <DataTable
            className="overflow-x-auto"
            rows={filtered}
            keyExtractor={(activity) => activity.id}
            onRowClick={(activity) => openActivity(activity.id)}
            emptyTitle="Nenhuma atividade encontrada"
            columns={[
              { key: 'title', header: 'Atividade', className: 'min-w-64', render: (activity) => (
                <div>
                  <p className="font-medium text-foreground">{activity.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{TASK_TYPE_LABELS[activity.taskType]}</p>
                </div>
              ) },
              { key: 'status', header: 'Status', render: (activity) => <Badge variant="secondary">{STATUS_LABELS[activity.status]}</Badge> },
              { key: 'priority', header: 'Prioridade', render: (activity) => <Badge variant={activity.priority === 'URGENT' ? 'destructive' : activity.priority === 'HIGH' ? 'warning' : 'outline'}>{PRIORITY_LABELS[activity.priority]}</Badge> },
              { key: 'assignedTo', header: 'Responsável', className: 'min-w-44', render: (activity) => <span className="inline-flex items-center gap-1.5"><User className="size-3.5 text-muted-foreground" />{getMemberName(activity.assignedTo)}</span> },
              { key: 'dueDate', header: 'Prazo', className: 'min-w-32', render: (activity) => activity.dueDate ? <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5 text-muted-foreground" />{formatDate(activity.dueDate)}</span> : <span className="text-muted-foreground">Sem prazo</span> },
              { key: 'checklist', header: 'Checklist', render: (activity) => activity.checklistTotal > 0 ? <span className="inline-flex items-center gap-1.5"><CheckSquare className="size-3.5 text-muted-foreground" />{activity.checklistCompleted}/{activity.checklistTotal}</span> : <span className="text-muted-foreground">—</span> },
              { key: 'weight', header: 'Peso', render: (activity) => <span className="inline-flex size-7 items-center justify-center rounded-md border text-xs font-semibold">{activity.weight}</span> },
            ]}
          />
        )}
      </QueryState>
    </section>
  )
}

function ColumnsManagerDialog({ projectId, columns }: { projectId: UUID; columns: ProjectColumn[] }) {
  const createColumn = useCreateProjectColumn(projectId)
  const updateColumn = useUpdateProjectColumn(projectId)
  const deleteColumn = useDeleteProjectColumn(projectId)
  const reorderColumns = useReorderProjectColumns(projectId)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#38bdf8')
  const [lifecycleStatus, setLifecycleStatus] = useState<ActivityStatus>('TODO')

  const handleAdd = async () => {
    if (!name.trim()) return
    try {
      await createColumn.mutateAsync({ name: name.trim(), color, lifecycleStatus })
      setName('')
      toast.success('Coluna criada')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao criar coluna')
    }
  }

  const moveColumn = async (columnId: UUID, direction: -1 | 1) => {
    const ordered = [...columns].sort((a, b) => a.position - b.position)
    const index = ordered.findIndex((c) => c.id === columnId)
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    const next = [...ordered]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    try {
      await reorderColumns.mutateAsync(next.map((c) => c.id))
      toast.success('Ordem atualizada')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao reordenar')
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="shrink-0">
          <Settings2 className="size-4" aria-hidden="true" />
          Colunas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Colunas do quadro</DialogTitle>
          <DialogDescription>Configure o fluxo do projeto: cada coluna corresponde a um status de ciclo de vida.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_6rem_9rem_auto]">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Testes" />
            <Input label="Cor" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            <Select
              label="Status"
              value={lifecycleStatus}
              onChange={(e) => setLifecycleStatus(e.target.value as ActivityStatus)}
              options={STATUS_OPTIONS.map((value) => ({ value, label: STATUS_LABELS[value] }))}
            />
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={!name.trim() || createColumn.isPending}>
                <Plus className="size-4" />
                Adicionar
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {[...columns].sort((a, b) => a.position - b.position).map((column, index) => (
              <div key={column.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/10 p-2">
                <span className="size-3 rounded-full" style={{ backgroundColor: column.color }} aria-hidden="true" />
                <Input
                  className="h-9 flex-1"
                  value={column.name}
                  onChange={(e) => updateColumn.mutateAsync({ columnId: column.id, data: { name: e.target.value } }).catch(() => undefined)}
                />
                <Input
                  className="h-9 w-14 p-1"
                  type="color"
                  value={column.color}
                  onChange={(e) => updateColumn.mutateAsync({ columnId: column.id, data: { color: e.target.value } }).catch(() => undefined)}
                />
                <Badge variant="secondary" className="w-28 justify-center">{STATUS_LABELS[column.lifecycleStatus]}</Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => moveColumn(column.id, -1)} aria-label="Subir">↑</Button>
                  <Button size="sm" variant="ghost" disabled={index === columns.length - 1} onClick={() => moveColumn(column.id, 1)} aria-label="Descer">↓</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteColumn.mutateAsync(column.id).catch((e: any) => toast.error(e?.message || 'Falha ao remover'))}
                    aria-label={`Remover ${column.name}`}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
            {columns.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma coluna. Adicione a primeira acima.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ViewButton({ active, icon: Icon, onClick, children }: { active: boolean; icon: typeof List; onClick: () => void; children: string }) {
  return (
    <Button type="button" size="sm" variant={active ? 'secondary' : 'ghost'} onClick={onClick} aria-pressed={active} className="shrink-0">
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </Button>
  )
}
