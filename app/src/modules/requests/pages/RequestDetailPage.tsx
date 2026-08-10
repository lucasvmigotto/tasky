import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, CheckCircle2, FolderKanban, GitBranch, Layers, Loader2, MessageSquare, Plus, Send, Trash2, Users2, X } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import {
  useRequest,
  useDepartments,
  useMemberships,
  useProjects,
  useRequestComments,
  useAddRequestComment,
  useDeleteRequestComment,
  useChangeRequestStatus,
  useConvertRequestToProject,
  useLinkRequestProject,
  useUpdateRequest,
  useRequestTasks,
  useCreateRequestTasks,
  useProjectColumns,
  useMoveActivity,
} from '@/core/api/hooks'
import type { ActivityPriority, InternalRequest, RequestPriority, RequestStatus, RequestTaskItem, UUID } from '@/core/api/types'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Select } from '@/shared/components/ui/Select'
import { Input } from '@/shared/components/ui/Input'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/Tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/shared/components/ui/Dialog'
import { KanbanBoard, type KanbanColumnDef } from '@/shared/components/kanban/KanbanBoard'
import { STATUS_LABELS as ACTIVITY_STATUS_LABELS } from '@/shared/components/kanban/ActivityCard'
import { DocumentationPanel } from '@/shared/components/documentation/DocumentationPanel'
import { buildRoute, ROUTES } from '@/core/config/routes'
import { toast } from 'sonner'

const PRIORITY_LABELS: Record<RequestPriority, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: 'Nova',
  TRIAGE: 'Em triagem',
  PLANNED: 'Planejada',
  IN_PROGRESS: 'Em execução',
  BLOCKED: 'Bloqueada',
  DONE: 'Concluída',
  CANCELED: 'Cancelada',
}

interface TaskDraft {
  id: string
  title: string
  description: string
  priority: ActivityPriority
  weight: number
  dueDate: string
  assignees: UUID[]
}

export default function RequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const navigate = useNavigate()
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null
  const role = activeOrg?.role ?? 'employee'

  const { data: request, isLoading } = useRequest((requestId as UUID) ?? null)
  const { data: departments = [] } = useDepartments(orgId as UUID)
  const { data: memberships = [] } = useMemberships(orgId as UUID)
  const { data: projects = [] } = useProjects(orgId as UUID)
  const { data: comments = [] } = useRequestComments((requestId as UUID) ?? null)
  const { data: tasks = [] } = useRequestTasks((requestId as UUID) ?? null)
  const { data: columns = [] } = useProjectColumns(request?.projectId ?? null)

  const changeStatus = useChangeRequestStatus()
  const convertToProject = useConvertRequestToProject()
  const linkProject = useLinkRequestProject()
  const updateRequest = useUpdateRequest()
  const addComment = useAddRequestComment()
  const deleteComment = useDeleteRequestComment()
  const createTasks = useCreateRequestTasks((requestId as UUID) ?? '')
  const moveActivity = useMoveActivity()

  const [commentText, setCommentText] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState<UUID[]>([])
  const [taskWizardOpen, setTaskWizardOpen] = useState(false)
  const [drafts, setDrafts] = useState<TaskDraft[]>([])

  const deptName = (id: string | null) => departments.find((d) => d.id === id)?.name ?? '—'
  const memberName = (id: string | null) => {
    if (!id) return 'Não atribuída'
    return memberships.find((m) => m.id === id)?.username ?? '—'
  }
  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? null

  const canManage = role === 'admin' || role === 'manager' || role === 'super_admin'
  const editable = request && request.status !== 'DONE' && request.status !== 'CANCELED'

  const actionStack = useMemo(() => {
    if (!request) return []
    switch (request.status) {
      case 'NEW':
        return [{ key: 'triage' as const, label: 'Iniciar triagem', action: () => changeStatus.mutateAsync({ requestId: request.id, status: 'TRIAGE' }) }]
      case 'TRIAGE':
        return [
          { key: 'plan' as const, label: 'Planejar', action: () => changeStatus.mutateAsync({ requestId: request.id, status: 'PLANNED' }) },
          { key: 'convert' as const, label: 'Converter em projeto', action: handleConvert },
        ]
      case 'PLANNED':
        return [{ key: 'start' as const, label: 'Iniciar execução', action: () => changeStatus.mutateAsync({ requestId: request.id, status: 'IN_PROGRESS' }) }]
      case 'IN_PROGRESS':
        return [
          { key: 'done' as const, label: 'Concluir', action: () => changeStatus.mutateAsync({ requestId: request.id, status: 'DONE' }) },
          { key: 'blocked' as const, label: 'Bloquear', action: () => changeStatus.mutateAsync({ requestId: request.id, status: 'BLOCKED' }) },
        ]
      case 'BLOCKED':
        return [
          { key: 'resume' as const, label: 'Retomar execução', action: () => changeStatus.mutateAsync({ requestId: request.id, status: 'IN_PROGRESS' }) },
          { key: 'done' as const, label: 'Concluir', action: () => changeStatus.mutateAsync({ requestId: request.id, status: 'DONE' }) },
        ]
      default:
        return []
    }
  }, [request, changeStatus])

  const boardColumns: KanbanColumnDef[] = useMemo(() => {
    if (columns.length > 0) {
      return columns.map((column) => ({
        key: column.lifecycleStatus,
        label: column.name,
        accent: 'text-foreground',
        color: column.color,
      }))
    }
    return [
      { key: 'TODO', label: 'A Fazer', accent: 'text-sky-400' },
      { key: 'IN_PROGRESS', label: 'Em Andamento', accent: 'text-amber-400' },
      { key: 'IN_TESTING', label: 'Em Testes', accent: 'text-violet-400' },
      { key: 'BLOCKED', label: 'Bloqueado', accent: 'text-red-400' },
      { key: 'DONE', label: 'Concluído', accent: 'text-emerald-400' },
      { key: 'CANCELED', label: 'Cancelado', accent: 'text-muted-foreground' },
    ]
  }, [columns])

  async function handleConvert() {
    if (!request) return
    try {
      await convertToProject.mutateAsync({ requestId: request.id })
      toast.success(`Demanda ${request.requestKey} convertida em projeto`)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao converter demanda')
    }
  }

  async function handleLinkProject() {
    if (!request || !selectedProjectId) return
    try {
      await linkProject.mutateAsync({ requestId: request.id, projectId: selectedProjectId as UUID })
      toast.success('Projeto vinculado à demanda')
      setSelectedProjectId('')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao vincular projeto')
    }
  }

  async function handleAssign() {
    if (!request) return
    try {
      await updateRequest.mutateAsync({ requestId: request.id, data: { assigneeMembershipIds: selectedAssignees } })
      toast.success('Responsáveis atualizados')
      setSelectedAssignees([])
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao atribuir responsáveis')
    }
  }

  async function handleAddComment() {
    if (!request || !commentText.trim()) return
    try {
      await addComment.mutateAsync({ requestId: request.id, content: commentText.trim() })
      setCommentText('')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao comentar')
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!request) return
    try {
      await deleteComment.mutateAsync({ requestId: request.id, commentId: commentId as UUID })
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover comentário')
    }
  }

  function openWizard() {
    setDrafts([newDraft()])
    setTaskWizardOpen(true)
  }

  function newDraft(): TaskDraft {
    return { id: crypto.randomUUID(), title: '', description: '', priority: 'NORMAL', weight: 1, dueDate: '', assignees: [] }
  }

  function updateDraft(id: string, patch: Partial<TaskDraft>) {
    setDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)))
  }

  async function handleCreateTasks() {
    if (!request || drafts.length === 0) return
    const items: RequestTaskItem[] = drafts
      .filter((draft) => draft.title.trim())
      .map((draft) => ({
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        priority: draft.priority,
        weight: draft.weight,
        dueDate: draft.dueDate ? new Date(draft.dueDate).toISOString() : undefined,
        assigneeMembershipIds: draft.assignees.length > 0 ? draft.assignees : undefined,
      }))
    if (items.length === 0) {
      toast.error('Informe ao menos uma tarefa com título')
      return
    }
    try {
      await createTasks.mutateAsync({ items })
      toast.success(`${items.length} tarefa(s) criada(s)`)
      setTaskWizardOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao criar tarefas')
    }
  }

  async function handleMove(activityId: string, data: { status?: any; position?: number; expectedVersion?: number }) {
    try {
      const column = columns.find((candidate) => candidate.lifecycleStatus === data.status)
      const payload = column
        ? { columnId: column.id, position: data.position, expectedVersion: data.expectedVersion }
        : { status: data.status, position: data.position, expectedVersion: data.expectedVersion }
      await moveActivity.mutateAsync({ activityId: activityId as UUID, data: payload })
      toast.success('Tarefa movida')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao mover tarefa')
      throw e
    }
  }

  if (isLoading || !request) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 w-full lg:col-span-2" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  const assigneeNames = (request.assigneeMembershipIds?.length
    ? request.assigneeMembershipIds.map((id) => memberName(id)).filter((n) => n !== 'Não atribuída')
    : []
  ).join(', ') || memberName(request.assigneeMembershipId)

  return (
    <motion.div className="flex flex-col gap-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <Button variant="ghost" size="sm" className="mb-2 text-muted-foreground" onClick={() => navigate(ROUTES.REQUESTS)}>
          <ArrowLeft className="size-4" />
          Voltar às demandas
        </Button>
        <PageHeader
          title={`${request.requestKey} · ${request.title}`}
          description={`Criada em ${new Date(request.createdAt).toLocaleString('pt-BR')}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {request.glpiTicketId && (
              <Badge variant="outline" className="font-mono">GLPI #{request.glpiTicketId}</Badge>
            )}
            <Badge variant={request.priority === 'URGENT' ? 'destructive' : request.priority === 'HIGH' ? 'warning' : 'secondary'}>
              {PRIORITY_LABELS[request.priority]}
            </Badge>
            <Badge variant={request.status === 'DONE' ? 'success' : request.status === 'BLOCKED' ? 'destructive' : request.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
              {STATUS_LABELS[request.status]}
            </Badge>
            {canManage && editable && actionStack.map((action) => (
              <Button key={action.key} size="sm" variant="outline" onClick={() => action.action().then(() => toast.success('Demanda atualizada')).catch((e: any) => toast.error(e?.message || 'Falha na ação'))}>
                {action.label}
              </Button>
            ))}
          </div>
        </PageHeader>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="board">Quadro</TabsTrigger>
          <TabsTrigger value="comments">Comentários</TabsTrigger>
          <TabsTrigger value="docs">Documentação</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                {request.description ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{request.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem descrição.</p>
                )}
              </CardContent>
            </Card>

            {request.projectId && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="size-4 text-primary" />
                    Projeto vinculado
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    className="flex items-center gap-2 text-left text-sm text-foreground hover:text-primary"
                    onClick={() => navigate(buildRoute(ROUTES.PROJECT_DETAIL, { projectId: request.projectId as string }))}
                  >
                    <GitBranch className="size-4 text-muted-foreground" />
                    {projectName(request.projectId) ?? 'Ver projeto'}
                  </button>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={openWizard}>
                      <Plus className="size-4" />
                      Criar tarefas
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(buildRoute(ROUTES.PROJECT_DETAIL, { projectId: request.projectId as string }))}>
                      Abrir projeto
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <DetailRow label="Solicitante" value={memberName(request.requesterMembershipId)} />
                <DetailRow label="Área solicitante" value={deptName(request.requestingDepartmentId)} />
                <DetailRow label="Área responsável" value={deptName(request.responsibleDepartmentId)} />
                <DetailRow label="Responsáveis" value={assigneeNames} />
                <DetailRow
                  label="Prazo desejado"
                  value={request.desiredDueDate ? new Date(request.desiredDueDate).toLocaleDateString('pt-BR') : '—'}
                />
                {request.completedAt && (
                  <DetailRow label="Concluída em" value={new Date(request.completedAt).toLocaleString('pt-BR')} />
                )}
              </CardContent>
            </Card>

            {canManage && editable && (
              <Card>
                <CardHeader>
                  <CardTitle>Gestão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-foreground">Responsáveis</span>
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                      {memberships.map((m) => {
                        const active = selectedAssignees.includes(m.id)
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedAssignees((prev) => active ? prev.filter((id) => id !== m.id) : [...prev, m.id])}
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                              active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                            }`}
                          >
                            {m.customUsername || m.username}
                          </button>
                        )
                      })}
                    </div>
                    <Button size="sm" variant="outline" onClick={handleAssign} disabled={selectedAssignees.length === 0}>
                      <Users2 className="size-4" />
                      Atribuir
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Select
                      label="Vincular projeto existente"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      placeholder="Selecione"
                      options={projects.filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))}
                    />
                    <Button size="sm" variant="outline" onClick={handleLinkProject} disabled={!selectedProjectId}>
                      <FolderKanban className="size-4" />
                      Vincular
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="board" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Layers className="size-4 text-muted-foreground" />
                Tarefas da demanda
              </h2>
              <p className="text-sm text-muted-foreground">{tasks.length} tarefa(s) no quadro</p>
            </div>
            {request.projectId ? (
              <Button size="sm" onClick={openWizard}>
                <Plus className="size-4" />
                Criar tarefas
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Vincule a demanda a um projeto para criar tarefas.</p>
            )}
          </div>

          {request.projectId ? (
            tasks.length === 0 ? (
              <Card>
                <CardContent className="p-8">
                  <EmptyState
                    icon={Layers}
                    title="Nenhuma tarefa ainda"
                    description="Crie as tarefas desta demanda para montar o quadro de planejamento, execução e testes."
                    actionLabel="Criar tarefas"
                    onAction={openWizard}
                  />
                </CardContent>
              </Card>
            ) : (
              <KanbanBoard
                columns={boardColumns}
                items={tasks}
                onMove={handleMove}
                onOpen={(activityId) => navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId }))}
                getMemberName={memberName}
                getProjectName={(id) => projectName(id) ?? '—'}
              />
            )
          ) : (
            <Card>
              <CardContent className="p-8">
                <EmptyState
                  icon={GitBranch}
                  title="Projeto não vinculado"
                  description="Para montar o quadro de tarefas, vincule esta demanda a um projeto existente na aba Detalhes."
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comments" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-4 text-muted-foreground" />
                Comentários
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Textarea
                  placeholder="Escreva um comentário..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim() || addComment.isPending}>
                    {addComment.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Comentar
                  </Button>
                </div>
              </div>

              {comments.length === 0 ? (
                <EmptyState icon={MessageSquare} title="Sem comentários" description="Seja o primeiro a comentar esta demanda." />
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-border/60 bg-muted/20 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{memberName(comment.authorMembershipId)}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString('pt-BR')}</span>
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => handleDeleteComment(comment.id)}>
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <DocumentationPanel requestId={request.id} />
        </TabsContent>
      </Tabs>

      <Dialog open={taskWizardOpen} onOpenChange={setTaskWizardOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar tarefas da demanda</DialogTitle>
            <DialogDescription>Monte as tarefas que serão executadas. Elas entram no quadro de planejamento, execução e testes.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {drafts.map((draft, index) => (
              <div key={draft.id} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Tarefa {index + 1}</span>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => setDrafts((prev) => prev.filter((d) => d.id !== draft.id))} disabled={drafts.length === 1}>
                    <X className="size-4" />
                  </Button>
                </div>
                <Input label="Título" placeholder="Ex: Corrigir texto da página inicial" value={draft.title} onChange={(e) => updateDraft(draft.id, { title: e.target.value })} />
                <Textarea label="Descrição" placeholder="Detalhes da tarefa" value={draft.description} onChange={(e) => updateDraft(draft.id, { description: e.target.value })} />
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Select
                    label="Prioridade"
                    value={draft.priority}
                    onChange={(e) => updateDraft(draft.id, { priority: e.target.value as ActivityPriority })}
                    options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
                  />
                  <Select
                    label="Peso"
                    value={String(draft.weight)}
                    onChange={(e) => updateDraft(draft.id, { weight: Number(e.target.value) })}
                    options={[1, 2, 3, 5, 8, 13].map((value) => ({ value: String(value), label: String(value) }))}
                  />
                  <Input label="Prazo" type="date" value={draft.dueDate} onChange={(e) => updateDraft(draft.id, { dueDate: e.target.value })} />
                </div>
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-foreground">Responsáveis</span>
                  <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                    {memberships.map((m) => {
                      const active = draft.assignees.includes(m.id)
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => updateDraft(draft.id, {
                            assignees: active ? draft.assignees.filter((id) => id !== m.id) : [...draft.assignees, m.id],
                          })}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                            active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {m.customUsername || m.username}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={() => setDrafts((prev) => [...prev, newDraft()])}>
              <Plus className="size-4" />
              Adicionar tarefa
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskWizardOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateTasks} disabled={createTasks.isPending}>
              {createTasks.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Criar tarefas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1 text-foreground">
        <CheckCircle2 className="size-3.5 text-muted-foreground" />
        {value}
      </span>
    </div>
  )
}
