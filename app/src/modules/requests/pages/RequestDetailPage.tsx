import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, CheckCircle2, FolderKanban, GitBranch, Loader2, MessageSquare, Send, Trash2, Users2 } from 'lucide-react'
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
  useAssignRequest,
} from '@/core/api/hooks'
import type { InternalRequest, RequestPriority, RequestStatus, UUID } from '@/core/api/types'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Select } from '@/shared/components/ui/Select'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
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

  const changeStatus = useChangeRequestStatus()
  const convertToProject = useConvertRequestToProject()
  const linkProject = useLinkRequestProject()
  const assignRequest = useAssignRequest()
  const addComment = useAddRequestComment()
  const deleteComment = useDeleteRequestComment()

  const [commentText, setCommentText] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('')

  const deptName = (id: string | null) => departments.find((d) => d.id === id)?.name ?? '—'
  const memberName = (id: string | null) => {
    if (!id) return 'Não atribuída'
    return memberships.find((m) => m.id === id)?.username ?? '—'
  }
  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? null

  const canManage = role === 'admin' || role === 'manager'
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
    if (!request || !selectedAssigneeId) return
    try {
      await assignRequest.mutateAsync({ requestId: request.id, assigneeMembershipId: selectedAssigneeId as UUID })
      toast.success('Responsável atualizado')
      setSelectedAssigneeId('')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao atribuir responsável')
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                  <Select
                    label="Responsável"
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    placeholder="Selecione"
                    options={memberships.map((m) => ({ value: m.id, label: m.username }))}
                  />
                  <Button size="sm" variant="outline" onClick={handleAssign} disabled={!selectedAssigneeId}>
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

          {request.projectId && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="size-4 text-primary" />
                  Projeto vinculado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <button
                  className="flex w-full items-center justify-between text-left text-sm text-foreground hover:text-primary"
                  onClick={() => navigate(buildRoute(ROUTES.PROJECT_DETAIL, { projectId: request.projectId as string }))}
                >
                  <span className="flex items-center gap-2">
                    <GitBranch className="size-4 text-muted-foreground" />
                    {projectName(request.projectId) ?? 'Ver projeto'}
                  </span>
                  <span className="text-primary">Abrir</span>
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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
