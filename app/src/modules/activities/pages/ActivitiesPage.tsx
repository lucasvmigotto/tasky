import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Plus, List, Columns3, Clock, User, Loader2, CalendarClock, CheckSquare } from 'lucide-react'
import { ROUTES, buildRoute } from '@/core/config/routes'
import { useAuthStore } from '@/core/auth/authStore'
import { useActivities, useActivityQuery, useProjects, useMemberships, useLabels, useCreateActivity, useMoveActivity } from '@/core/api/hooks'
import type { ActivityResponse, ActivityStatus, ActivityTaskType, FibonacciWeight, UUID } from '@/core/api/types'
import { canCreateActivityFor } from '@/core/auth/permissions'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { Textarea } from '@/shared/components/ui/Textarea'
import { DataTable } from '@/shared/components/ui/DataTable'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/Dialog'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { formatDateTime, formatDate } from '@/shared/lib/formatters'
import { toast } from 'sonner'
import { KanbanBoard } from '@/shared/components/kanban/KanbanBoard'
import { PRIORITY_LABELS, STATUS_LABELS, TASK_TYPE_LABELS } from '@/shared/components/kanban/ActivityCard'

const WEIGHT_VALUES: FibonacciWeight[] = [1, 2, 3, 5, 8, 13]

const weightConfig: Record<number, { label: string; badge: string }> = {
  1: { label: '1', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  2: { label: '2', badge: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  3: { label: '3', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  5: { label: '5', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  8: { label: '8', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  13: { label: '13', badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

type ViewMode = 'list' | 'kanban'

const KANBAN_COLUMNS: { key: ActivityStatus; accent: string }[] = [
  { key: 'TODO', accent: 'bg-sky-500/10 text-sky-400' },
  { key: 'IN_PROGRESS', accent: 'bg-amber-500/10 text-amber-400' },
  { key: 'BLOCKED', accent: 'bg-red-500/10 text-red-400' },
  { key: 'DONE', accent: 'bg-emerald-500/10 text-emerald-400' },
  { key: 'CANCELED', accent: 'bg-muted text-muted-foreground' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.08 } },
}

export default function ActivitiesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedProjectId = searchParams.get('projectId') ?? ''
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [projectFilter, setProjectFilter] = useState(requestedProjectId || 'all')
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(searchParams.get('new') === '1')

  const { data: projects } = useProjects(orgId as UUID)
  const { data: members } = useMemberships(orgId as UUID)
  const { data: labels } = useLabels(orgId as UUID)
  const createActivity = useCreateActivity()
  const moveActivity = useMoveActivity()

  const { data: allActivities, isLoading: allLoading, error: allError } = useActivityQuery(projectFilter === 'all' ? {} : null)
  const { data: projectActivities, isLoading: projLoading, error: projectError } = useActivities(projectFilter === 'all' ? null : (projectFilter as UUID))
  const activities = projectFilter === 'all' ? allActivities : projectActivities
  const isLoading = projectFilter === 'all' ? allLoading : projLoading
  const error = projectFilter === 'all' ? allError : projectError

  const filtered = useMemo(() => {
    if (!activities) return []
    let list = activities
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((a) => a.title.toLowerCase().includes(q))
    }
    return list
      .slice()
      .sort((a, b) => a.status.localeCompare(b.status) || a.position - b.position || a.startDatetime.localeCompare(b.startDatetime))
  }, [activities, search])

  const getLabelName = (id: string) => labels?.find((l) => l.id === id)?.displayName ?? id
  const getMemberName = (id: string) => members?.find((m) => m.id === id)?.username ?? id
  const getProjectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? id

  const moveTo = async (activityId: string, data: { status: ActivityStatus; position?: number }) => {
    try {
      await moveActivity.mutateAsync({ activityId: activityId as UUID, data })
      toast.success(`Atividade movida para ${STATUS_LABELS[data.status]}`)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao mover atividade')
      throw e
    }
  }

  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newWeight, setNewWeight] = useState<FibonacciWeight>(1)
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [newParentActivityId, setNewParentActivityId] = useState('')
  const [newLabels, setNewLabels] = useState<string[]>([])
  const [createProjectId, setCreateProjectId] = useState(requestedProjectId)

  const handleCreate = async () => {
    if (!newTitle.trim() || !newStart || !newEnd || !newAssignee || !createProjectId) return
    if (new Date(newStart) >= new Date(newEnd)) {
      toast.error('O início deve ser anterior ao fim')
      return
    }
    try {
      await createActivity.mutateAsync({
        projectId: createProjectId as UUID,
        data: {
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          weight: newWeight,
          startDatetime: new Date(newStart).toISOString(),
          endDatetime: new Date(newEnd).toISOString(),
          assignedToMembershipId: newAssignee as UUID,
          parentActivityId: newParentActivityId ? newParentActivityId as UUID : undefined,
          labelIds: newLabels.length > 0 ? newLabels as UUID[] : undefined,
        },
      })
      toast.success('Atividade criada')
      setNewTitle('')
      setNewDesc('')
      setNewWeight(1)
      setNewStart('')
      setNewEnd('')
      setNewAssignee('')
      setNewParentActivityId('')
      setNewLabels([])
      setIsDialogOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao criar atividade')
    }
  }

  const isSelf = (membershipId: string) => {
    const m = members?.find((m) => m.id === membershipId)
    return m?.userId === user?.id
  }

  const parentOptions = filtered
    .filter((activity) => activity.projectId === createProjectId && activity.parentActivityId == null)
    .map((activity) => ({ value: activity.id, label: activity.title }))

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Atividades" description="Acompanhe suas atividades de trabalho" />
        <EmptyState icon={Clock} title="Falha ao carregar atividades" description={error.message} />
      </div>
    )
  }

  const openActivity = (id: string) => navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: id }))

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader title="Atividades" description="Acompanhe suas atividades de trabalho">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            placeholder="Todos os projetos"
            options={[
              { value: 'all', label: 'Todos os projetos' },
              ...(projects?.map((p) => ({ value: p.id, label: p.name })) ?? []),
            ]}
          />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40"
          />
          <div className="flex rounded-lg border bg-card p-0.5">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-8"
              onClick={() => setViewMode('list')}
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-8"
              onClick={() => setViewMode('kanban')}
            >
              <Columns3 className="size-4" />
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                Nova Atividade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Atividade</DialogTitle>
                <DialogDescription>Crie uma nova atividade de tempo.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <Select
                  label="Projeto"
                  value={createProjectId}
                  onChange={(e) => { setCreateProjectId(e.target.value); setNewAssignee('') }}
                  placeholder="Selecione o projeto"
                  options={projects?.map((p) => ({ value: p.id, label: p.name })) ?? []}
                />
                <Input label="Título" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="No que você está trabalhando?" />
                <Textarea label="Descrição" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Detalhes opcionais..." />
                <Select
                  label="Peso"
                  value={newWeight.toString()}
                  onChange={(e) => setNewWeight(Number(e.target.value) as FibonacciWeight)}
                  options={WEIGHT_VALUES.map((w) => ({ value: w.toString(), label: `Nível ${w}` }))}
                />
                <Input label="Início" type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                <Input label="Fim" type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                <Select
                  label="Responsável"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  placeholder="Selecione o responsável"
                  options={
                    members
                      ?.filter((m) => isSelf(m.id) || canCreateActivityFor(role, m.role))
                      .map((m) => ({ value: m.id, label: `${m.username} (${m.role})` })) ?? []
                  }
                />
                <Select
                  label="Atividade pai"
                  value={newParentActivityId}
                  onChange={(e) => setNewParentActivityId(e.target.value)}
                  placeholder="Sem pai"
                  options={parentOptions}
                />
                <Select
                  label="Etiquetas"
                  value={newLabels[0] ?? ''}
                  onChange={(e) => setNewLabels(e.target.value ? [e.target.value] : [])}
                  placeholder="Selecione a etiqueta"
                  options={labels?.map((l) => ({ value: l.id, label: l.displayName })) ?? []}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={!newTitle.trim() || !newStart || !newEnd || !newAssignee || !createProjectId || createActivity.isPending}>
                  {createActivity.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {filtered.length === 0 ? (
        <EmptyState icon={Clock} title="Nenhuma atividade encontrada" description="Crie sua primeira atividade para começar a registrar o tempo." actionLabel="Nova Atividade" onAction={() => setIsDialogOpen(true)} />
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          columns={KANBAN_COLUMNS.map((column) => ({ ...column, label: STATUS_LABELS[column.key] }))}
          items={filtered}
          onMove={moveTo}
          onOpen={openActivity}
          getMemberName={getMemberName}
          getProjectName={getProjectName}
        />
      ) : (
        <DataTable
          columns={[
            { key: 'title', header: 'Título', render: (row: any) => (
              <div>
                <button className="font-medium hover:text-primary" onClick={() => openActivity(row.id)}>{row.title}</button>
                <div className="text-xs text-muted-foreground">{getProjectName(row.projectId)}</div>
              </div>
            )},
            { key: 'taskType', header: 'Tipo', render: (row: any) => <Badge variant="outline">{TASK_TYPE_LABELS[row.taskType as ActivityTaskType]}</Badge> },
            { key: 'priority', header: 'Prioridade', render: (row: any) => <Badge variant={row.priority === 'URGENT' ? 'destructive' : row.priority === 'HIGH' ? 'warning' : 'secondary'}>{PRIORITY_LABELS[row.priority as keyof typeof PRIORITY_LABELS]}</Badge> },
            { key: 'dueDate', header: 'Prazo', render: (row: any) => row.dueDate ? <span className="inline-flex items-center gap-1 text-sm"><CalendarClock className="size-3.5 text-muted-foreground" />{formatDate(row.dueDate)}</span> : <span className="text-muted-foreground">—</span> },
            { key: 'checklist', header: 'Checklist', render: (row: any) => row.checklistTotal > 0 ? (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><CheckSquare className="size-3.5" />{row.checklistCompleted}/{row.checklistTotal}</span>
            ) : <span className="text-muted-foreground">—</span> },
            { key: 'weight', header: 'P', render: (row: any) => (
              <span className={`inline-flex size-7 items-center justify-center rounded-md border text-xs font-medium ${weightConfig[row.weight as number]?.badge}`}>{row.weight}</span>
            )},
            { key: 'assignedTo', header: 'Responsável', render: (row: any) => (
              <span className="flex items-center gap-1 text-sm"><User className="size-3.5 text-muted-foreground" />{getMemberName(row.assignedTo)}</span>
            )},
            { key: 'status', header: 'Status', render: (row: any) => <Badge variant="secondary">{STATUS_LABELS[row.status as ActivityStatus]}</Badge> },
            { key: 'startDatetime', header: 'Início', render: (row: any) => formatDateTime(row.startDatetime) },
            { key: 'endDatetime', header: 'Fim', render: (row: any) => formatDateTime(row.endDatetime) },
            { key: 'labelIds', header: 'Etiquetas', render: (row: any) => (
              <div className="flex gap-1">
                {(row.labelIds as string[]).slice(0, 2).map((id: string) => (
                  <Badge key={id} variant="secondary">{getLabelName(id)}</Badge>
                ))}
              </div>
            )},
          ]}
          rows={filtered}
          keyExtractor={(row: any) => row.id}
          onRowClick={(row: any) => openActivity(row.id)}
          emptyTitle="Nenhuma atividade ainda."
        />
      )}
    </motion.div>
  )
}
