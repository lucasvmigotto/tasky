import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  Clock,
  User,
  Tag,
  FolderKanban,
  Trash2,
  Edit3,
  Link as LinkIcon,
  Unlink,
  Plus,
} from 'lucide-react'
import { ROUTES, buildRoute } from '@/core/config/routes'
import type { Activity, FibonacciWeight } from '@/core/types/models'
import { useAuthStore } from '@/core/auth/authStore'
import { canEditActivity } from '@/core/auth/permissions'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Select } from '@/shared/components/ui/Select'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/Dialog'
import { Avatar, AvatarFallback } from '@/shared/components/ui/Avatar'
import { Separator } from '@/shared/components/ui/Separator'
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

function getLabels(labels: string[]) {
  return demoLabels.filter((l) => labels.includes(l.id))
}

function getActivityStatus(activity: Activity): string {
  const now = new Date()
  const end = new Date(activity.endDatetime)
  if (end < now) return 'Concluído'
  const start = new Date(activity.startDatetime)
  if (start > now) return 'A Fazer'
  return 'Em Andamento'
}

function getStatusBadge(status: string): { variant: 'success' | 'warning' | 'info'; label: string } {
  if (status === 'Concluído') return { variant: 'success', label: 'Concluído' }
  if (status === 'Em Andamento') return { variant: 'warning', label: 'Em Andamento' }
  return { variant: 'info', label: 'A Fazer' }
}

function getDurationHours(start: string, end: string): number {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Math.max(0, Math.round((e - s) / 3600000))
}

export default function ActivityDetailPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const { activeOrg } = useAuthStore()

  const [activities, setActivities] = useState<Activity[]>(demoActivities)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [depOpen, setDepOpen] = useState(false)

  const activity = useMemo(
    () => activities.find((a) => a.id === activityId) ?? null,
    [activities, activityId],
  )

  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formWeight, setFormWeight] = useState<FibonacciWeight>(3)
  const [formProject, setFormProject] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formAssignee, setFormAssignee] = useState('')
  const [formLabels, setFormLabels] = useState<string[]>([])

  const dependentActivities = useMemo(
    () => activities.filter((a) => a.parentIds.includes(activityId ?? '')),
    [activities, activityId],
  )

  const parentActivities = useMemo(
    () => activities.filter((a) => activity?.parentIds.includes(a.id)),
    [activities, activity],
  )

  const availableParents = useMemo(
    () =>
      activities.filter(
        (a) => a.id !== activityId && !(activity?.parentIds.includes(a.id)),
      ),
    [activities, activityId, activity],
  )

  function openEdit() {
    if (!activity) return
    setFormTitle(activity.title)
    setFormDescription(activity.description ?? '')
    setFormWeight(activity.weight as FibonacciWeight)
    setFormProject(activity.projectId)
    setFormStart(activity.startDatetime.slice(0, 16))
    setFormEnd(activity.endDatetime.slice(0, 16))
    setFormAssignee(activity.assignedTo)
    setFormLabels([...activity.labelIds])
    setEditOpen(true)
  }

  function handleEdit() {
    if (!activity) return
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activity.id
          ? {
              ...a,
              title: formTitle,
              description: formDescription || null,
              weight: formWeight,
              projectId: formProject,
              startDatetime: formStart,
              endDatetime: formEnd,
              assignedTo: formAssignee,
              labelIds: formLabels,
            }
          : a,
      ),
    )
    setEditOpen(false)
  }

  function handleDelete() {
    if (!activity) return
    setActivities((prev) => prev.filter((a) => a.id !== activity.id))
    setDeleteOpen(false)
    navigate(ROUTES.ACTIVITIES)
  }

  function handleAddDependency(activityId: string) {
    if (!activity) return
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activity.id
          ? { ...a, parentIds: [...a.parentIds, activityId] }
          : a,
      ),
    )
    setDepOpen(false)
  }

  function handleRemoveDependency(parentId: string) {
    if (!activity) return
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activity.id
          ? { ...a, parentIds: a.parentIds.filter((id) => id !== parentId) }
          : a,
      ),
    )
  }

  const canEdit = canEditActivity(activeOrg?.role ?? 'employee')

  if (!activity) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Atividade não encontrada">
          <Button variant="outline" onClick={() => navigate(ROUTES.ACTIVITIES)}>
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
        </PageHeader>
      </div>
    )
  }

  const labels = getLabels(activity.labelIds)
  const durationHours = getDurationHours(activity.startDatetime, activity.endDatetime)
  const status = getActivityStatus(activity)
  const statusBadge = getStatusBadge(status)
  const projectName = getProjectName(activity.projectId)
  const assigneeName = getMemberName(activity.assignedTo)
  const assigneeInitials = getMemberInitials(activity.assignedTo)
  const weightCfg = weightConfig[activity.weight]

  function toggleLabel(labelId: string) {
    setFormLabels((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={activity.title}>
        <Button variant="outline" onClick={() => navigate(ROUTES.ACTIVITIES)}>
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openEdit}>
              <Edit3 className="size-4" />
              Editar
            </Button>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="size-4" />
                  Excluir
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir Atividade</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir "{activity.title}"? Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    Excluir
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="size-2 rounded-full bg-primary" />
                Detalhes da Atividade
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {activity.description && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Descrição</span>
                  <p className="mt-1 text-sm text-foreground leading-relaxed">{activity.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <div className="mt-1">
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Peso</span>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${weightCfg?.badge}`}
                    >
                      {weightCfg?.label ?? activity.weight}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Início</span>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {formatDateTime(activity.startDatetime)}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Fim</span>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {formatDateTime(activity.endDatetime)}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Duração</span>
                  <p className="mt-1 text-sm text-foreground">
                    {durationHours}h ({Math.round(durationHours / 8 / 0.25) * 0.25} dias úteis)
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Criada em</span>
                  <p className="mt-1 text-sm text-foreground">{formatDateTime(activity.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LinkIcon className="size-4 text-muted-foreground" />
                Dependências
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Depende de ({parentActivities.length})
                  </span>
                  {canEdit && (
                    <Dialog open={depOpen} onOpenChange={setDepOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          <Plus className="size-3.5" />
                          Adicionar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Dependência</DialogTitle>
                          <DialogDescription>
                            Selecione a atividade da qual esta atividade depende
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-2 py-2 max-h-60 overflow-y-auto">
                          {availableParents.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                              Nenhuma atividade disponível
                            </p>
                          ) : (
                            availableParents.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => handleAddDependency(a.id)}
                                className="flex items-center gap-3 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="truncate font-medium text-foreground">{a.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {getProjectName(a.projectId)} · Peso {a.weight}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="shrink-0 text-xs">
                                  {getActivityStatus(a)}
                                </Badge>
                              </button>
                            ))
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDepOpen(false)}>
                            Cancelar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                {parentActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma dependência</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {parentActivities.map((parent) => (
                      <motion.div
                        key={parent.id}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/30"
                      >
                        <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() =>
                            navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: parent.id }))
                          }
                        >
                          <p className="truncate text-sm font-medium text-foreground hover:text-primary transition-colors">
                            {parent.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getProjectName(parent.projectId)} · Peso {parent.weight}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {getActivityStatus(parent)}
                        </Badge>
                        {canEdit && (
                          <button
                            onClick={() => handleRemoveDependency(parent.id)}
                            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Unlink className="size-3.5" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <span className="mb-3 block text-sm font-medium text-foreground">
                  Bloqueia ({dependentActivities.length})
                </span>
                {dependentActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma atividade bloqueada</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dependentActivities.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/30"
                        onClick={() =>
                          navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: dep.id }))
                        }
                      >
                        <ArrowLeft className="size-4 shrink-0 rotate-180 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{dep.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {getProjectName(dep.projectId)} · Peso {dep.weight}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {getActivityStatus(dep)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4 text-muted-foreground" />
                Responsável
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback>{assigneeInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{assigneeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {demoMembers.find((m) => m.id === activity.assignedTo)?.role ?? '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderKanban className="size-4 text-muted-foreground" />
                Projeto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                to={buildRoute(ROUTES.PROJECT_DETAIL, { projectId: activity.projectId })}
                className="flex items-center gap-3 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                  {projectName.charAt(0).toUpperCase()}
                </div>
                {projectName}
              </Link>
            </CardContent>
          </Card>

          {labels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="size-4 text-muted-foreground" />
                  Etiquetas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {labels.map((l) => (
                    <Badge key={l.id} variant="outline">
                      {l.displayName}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Atividade</DialogTitle>
            <DialogDescription>Altere os dados da atividade</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input
              label="Título"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
            <Textarea
              label="Descrição"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={!formTitle}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
