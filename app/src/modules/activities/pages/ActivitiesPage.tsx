import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  Plus,
  List,
  Columns3,
  Clock,
  User,
  MoreHorizontal,
} from 'lucide-react'
import { ROUTES, buildRoute } from '@/core/config/routes'
import type { Activity, FibonacciWeight } from '@/core/types/models'
import { useAuthStore } from '@/core/auth/authStore'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { Textarea } from '@/shared/components/ui/Textarea'
import { DataTable } from '@/shared/components/ui/DataTable'
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
import { formatDateTime } from '@/shared/lib/formatters'
import { demoActivities } from '@/modules/activities/data/activities.mock'
import { demoProjects } from '@/modules/projects/data/projects.mock'
import { demoMembers } from '@/modules/admin/data/members.mock'
import { demoLabels } from '@/modules/admin/data/labels.mock'

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
type ActivityStatus = 'todo' | 'in_progress' | 'done'

function getActivityStatus(activity: Activity): ActivityStatus {
  const now = new Date()
  const start = new Date(activity.startDatetime)
  const end = new Date(activity.endDatetime)
  if (end < now) return 'done'
  if (start <= now && end >= now) return 'in_progress'
  return 'todo'
}

function getProjectName(projectId: string): string {
  return demoProjects.find((p) => p.id === projectId)?.name ?? 'Desconhecido'
}

function getMemberName(membershipId: string): string {
  return demoMembers.find((m) => m.id === membershipId)?.username ?? 'Desconhecido'
}

function getMemberInitials(membershipId: string): string {
  const name = getMemberName(membershipId)
  return name
    .split(/[._\s]/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getLabels(activity: Activity) {
  return demoLabels.filter((l) => activity.labelIds.includes(l.id))
}

function getDependencyCount(activityId: string, activities: Activity[]): number {
  return activities.filter((a) => a.parentIds.includes(activityId)).length
}

function formatDateRange(start: string, end: string): string {
  return `${formatDateTime(start)} - ${formatDateTime(end)}`
}

export default function ActivitiesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterWeight, setFilterWeight] = useState('')
  const [filterLabel, setFilterLabel] = useState('')
  const [activities, setActivities] = useState<Activity[]>(demoActivities)

  const [createOpen, setCreateOpen] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formWeight, setFormWeight] = useState<FibonacciWeight>(3)
  const [formProject, setFormProject] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formAssignee, setFormAssignee] = useState('')
  const [formLabels, setFormLabels] = useState<string[]>([])
  const [formParents, setFormParents] = useState<string[]>([])

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterProject && a.projectId !== filterProject) return false
      if (filterAssignee && a.assignedTo !== filterAssignee) return false
      if (filterWeight && a.weight.toString() !== filterWeight) return false
      if (filterLabel && !a.labelIds.includes(filterLabel)) return false
      return true
    })
  }, [activities, search, filterProject, filterAssignee, filterWeight, filterLabel])

  const kanbanData = useMemo(() => {
    const todo: Activity[] = []
    const inProgress: Activity[] = []
    const done: Activity[] = []
    for (const a of filteredActivities) {
      const status = getActivityStatus(a)
      if (status === 'todo') todo.push(a)
      else if (status === 'in_progress') inProgress.push(a)
      else done.push(a)
    }
    return { todo, inProgress, done }
  }, [filteredActivities])

  function handleCreate() {
    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      projectId: formProject || demoProjects[0].id,
      title: formTitle,
      description: formDescription || null,
      weight: formWeight,
      startDatetime: formStart || new Date().toISOString(),
      endDatetime: formEnd || new Date(Date.now() + 86400000).toISOString(),
      createdBy: user?.id || 'memb-001',
      assignedTo: formAssignee || demoMembers[0].id,
      labelIds: formLabels,
      parentIds: formParents,
      createdAt: new Date().toISOString(),
    }
    setActivities((prev) => [newActivity, ...prev])
    setCreateOpen(false)
    setFormTitle('')
    setFormDescription('')
    setFormWeight(3)
    setFormProject('')
    setFormStart('')
    setFormEnd('')
    setFormAssignee('')
    setFormLabels([])
    setFormParents([])
  }

  function toggleLabel(labelId: string) {
    setFormLabels((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    )
  }

  function toggleParent(activityId: string) {
    setFormParents((prev) =>
      prev.includes(activityId) ? prev.filter((id) => id !== activityId) : [...prev, activityId],
    )
  }

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Título',
        render: (row: Activity) => (
          <span
            className="cursor-pointer font-medium text-foreground hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: row.id }))
            }}
          >
            {row.title}
          </span>
        ),
      },
      {
        key: 'project',
        header: 'Projeto',
        render: (row: Activity) => (
          <Badge variant="secondary" className="text-xs">
            {getProjectName(row.projectId)}
          </Badge>
        ),
      },
      {
        key: 'weight',
        header: 'Peso',
        render: (row: Activity) => {
          const cfg = weightConfig[row.weight]
          return (
            <span
              className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg?.badge}`}
            >
              {cfg?.label ?? row.weight}
            </span>
          )
        },
      },
      {
        key: 'assignedTo',
        header: 'Responsável',
        render: (row: Activity) => (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="size-3.5" />
            {getMemberName(row.assignedTo)}
          </span>
        ),
      },
      {
        key: 'dates',
        header: 'Início / Fim',
        render: (row: Activity) => (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0" />
            <span className="truncate max-w-[180px]">{formatDateRange(row.startDatetime, row.endDatetime)}</span>
          </span>
        ),
      },
      {
        key: 'labels',
        header: 'Etiquetas',
        render: (row: Activity) => {
          const labels = getLabels(row)
          return (
            <div className="flex flex-wrap gap-1">
              {labels.slice(0, 2).map((l) => (
                <Badge key={l.id} variant="outline" className="text-xs">
                  {l.displayName}
                </Badge>
              ))}
              {labels.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{labels.length - 2}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        key: 'deps',
        header: 'Dep.',
        render: (row: Activity) => {
          const count = getDependencyCount(row.id, demoActivities)
          return count > 0 ? (
            <span className="text-xs text-muted-foreground">{count} bloqueia(m)</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )
        },
      },
      {
        key: 'actions',
        header: '',
        className: 'w-12',
        render: (row: Activity) => (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={(e) => {
              e.stopPropagation()
              navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: row.id }))
            }}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        ),
      },
    ],
    [navigate],
  )

  function renderKanbanCard(activity: Activity) {
    const cfg = weightConfig[activity.weight]
    const labels = getLabels(activity)
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
        onClick={() => navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: activity.id }))}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-card-foreground leading-snug line-clamp-2">
            {activity.title}
          </span>
          <span
            className={`shrink-0 inline-flex items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none ${cfg?.badge}`}
          >
            {cfg?.label}
          </span>
        </div>
        <div className="mb-2 flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 leading-none">
            {getProjectName(activity.projectId)}
          </Badge>
        </div>
        {labels.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {labels.map((l) => (
              <Badge key={l.id} variant="outline" className="text-[10px] px-1.5 py-0 leading-none">
                {l.displayName}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="size-3" />
            {getMemberName(activity.assignedTo)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatDateTime(activity.startDatetime)}
          </span>
        </div>
      </motion.div>
    )
  }

  function renderKanbanColumn(title: string, statusColor: string, activities: Activity[]) {
    const statusLabel =
      title === 'A Fazer'
        ? 'todo'
        : title === 'Em Andamento'
          ? 'in_progress'
          : 'done'

    return (
      <div className="flex flex-col gap-3">
        <div className="mb-1 flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {activities.length}
          </span>
        </div>
        <AnimatePresence mode="popLayout">
          {activities.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              Nenhuma atividade
            </div>
          ) : (
            activities.map((a) => <div key={a.id}>{renderKanbanCard(a)}</div>)
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Atividades" description="Gerencie as atividades do seu time">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Nova Atividade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Atividade</DialogTitle>
              <DialogDescription>Preencha os dados para criar uma nova atividade</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <Input
                label="Título"
                placeholder="Digite o título da atividade"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
              <Textarea
                label="Descrição"
                placeholder="Descreva a atividade"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Peso"
                  value={formWeight.toString()}
                  onChange={(e) => setFormWeight(Number(e.target.value) as FibonacciWeight)}
                  options={WEIGHT_VALUES.map((w) => ({ value: w.toString(), label: w.toString() }))}
                />
                <Select
                  label="Projeto"
                  value={formProject}
                  onChange={(e) => setFormProject(e.target.value)}
                  options={demoProjects.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Selecione o projeto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Início"
                  type="datetime-local"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                />
                <Input
                  label="Fim"
                  type="datetime-local"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                />
              </div>
              <Select
                label="Responsável"
                value={formAssignee}
                onChange={(e) => setFormAssignee(e.target.value)}
                options={demoMembers.map((m) => ({ value: m.id, label: m.username }))}
                placeholder="Selecione o responsável"
              />
              <div>
                <span className="mb-1.5 block text-sm font-medium text-foreground">Etiquetas</span>
                <div className="flex flex-wrap gap-2">
                  {demoLabels.map((l) => {
                    const selected = formLabels.includes(l.id)
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => toggleLabel(l.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-muted-foreground'
                        }`}
                      >
                        {l.displayName}
                      </button>
                    )
                  })}
                </div>
              </div>
              {activities.length > 0 && (
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-foreground">Dependências</span>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {activities.map((a) => {
                      const selected = formParents.includes(a.id)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleParent(a.id)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                            selected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background text-muted-foreground hover:border-muted-foreground'
                          }`}
                        >
                          {a.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!formTitle}>
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="size-3.5" />
            Lista
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'kanban'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Columns3 className="size-3.5" />
            Kanban
          </button>
        </div>
        <div className="h-5 w-px bg-border" />
        <Input
          placeholder="Buscar por título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-[220px] text-sm"
        />
        <Select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          options={[
            { value: '', label: 'Todos projetos' },
            ...demoProjects.map((p) => ({ value: p.id, label: p.name })),
          ]}
          className="h-9 max-w-[160px] text-sm"
        />
        <Select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          options={[
            { value: '', label: 'Todos responsáveis' },
            ...demoMembers.map((m) => ({ value: m.id, label: m.username })),
          ]}
          className="h-9 max-w-[170px] text-sm"
        />
        <Select
          value={filterWeight}
          onChange={(e) => setFilterWeight(e.target.value)}
          options={[
            { value: '', label: 'Todos pesos' },
            ...WEIGHT_VALUES.map((w) => ({ value: w.toString(), label: w.toString() })),
          ]}
          className="h-9 max-w-[130px] text-sm"
        />
        {filterProject || filterAssignee || filterWeight || filterLabel || search ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              setSearch('')
              setFilterProject('')
              setFilterAssignee('')
              setFilterWeight('')
              setFilterLabel('')
            }}
          >
            Limpar filtros
          </Button>
        ) : null}
      </div>

      {viewMode === 'list' ? (
        <DataTable
          columns={columns}
          rows={filteredActivities}
          keyExtractor={(row) => row.id}
          emptyTitle="Nenhuma atividade encontrada"
          emptyDescription="Tente ajustar os filtros ou crie uma nova atividade"
          onRowClick={(row) =>
            navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: row.id }))
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {renderKanbanColumn('A Fazer', 'bg-muted-foreground', kanbanData.todo)}
          {renderKanbanColumn('Em Andamento', 'bg-primary', kanbanData.inProgress)}
          {renderKanbanColumn('Concluído', 'bg-success', kanbanData.done)}
        </div>
      )}
    </div>
  )
}
