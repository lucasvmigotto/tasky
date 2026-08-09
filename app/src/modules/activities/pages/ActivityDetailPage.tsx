import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Clock, User, FolderKanban, Trash2, Link2, Loader2, MessageSquare, Send, Paperclip, ExternalLink, Plus, CheckSquare } from 'lucide-react'
import { ROUTES, buildRoute } from '@/core/config/routes'
import { useAuthStore } from '@/core/auth/authStore'
import { canEditActivity } from '@/core/auth/permissions'
import { useActivity, useActivities, useProjects, useMemberships, useDeleteActivity, useAddDependency, useRemoveDependency, useActivityFeed, useMentionCandidates, useCreateActivityComment, useDeleteActivityComment, useActivityAttachments, useCreateActivityAttachment, useDeleteActivityAttachment, useActivityChecklist, useAddActivityChecklistItem, useToggleActivityChecklistItem, useDeleteActivityChecklistItem, useUpdateActivity } from '@/core/api/hooks'
import { DependencyTree } from '@/shared/components/activities/DependencyTree'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Select } from '@/shared/components/ui/Select'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar'
import { Separator } from '@/shared/components/ui/Separator'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { formatDateTime } from '@/shared/lib/formatters'
import { toast } from 'sonner'
import { safeHttpsUrl } from '@/shared/lib/safeUrl'
import type { UUID, ActivityPriority, ActivityTaskType, ActivityFeedItem, ActivityFeedEventType, MentionCandidate } from '@/core/api/types'

const weightConfig: Record<number, { label: string; badge: string }> = {
  1: { label: '1', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  2: { label: '2', badge: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  3: { label: '3', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  5: { label: '5', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  8: { label: '8', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  13: { label: '13', badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

const PRIORITY_LABELS: Record<ActivityPriority, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const TASK_TYPE_LABELS: Record<ActivityTaskType, string> = {
  TASK: 'Tarefa',
  BUG: 'Bug',
  IMPROVEMENT: 'Melhoria',
  SUPPORT: 'Suporte',
  MEETING: 'Reunião',
  MILESTONE: 'Marco',
}

const priorityLabel = (value: ActivityPriority) => PRIORITY_LABELS[value] ?? value
const taskTypeLabel = (value: ActivityTaskType) => TASK_TYPE_LABELS[value] ?? value

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function ActivityDetailPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { data: activity, isLoading, error } = useActivity(activityId as UUID)
  const { data: allActivities } = useActivities(activity?.projectId as UUID)
  const { data: projects } = useProjects(orgId as UUID)
  const { data: members } = useMemberships(orgId as UUID)
  const deleteActivity = useDeleteActivity()
  const addDependency = useAddDependency()
  const removeDependency = useRemoveDependency()
  const { data: feed = [] } = useActivityFeed(activityId as UUID)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIds, setMentionIds] = useState<UUID[]>([])
  const { data: mentionCandidates = [] } = useMentionCandidates(mentionQuery ? activityId as UUID : null, mentionQuery)
  const createComment = useCreateActivityComment()
  const deleteComment = useDeleteActivityComment()
  const { data: attachments = [] } = useActivityAttachments(activityId as UUID)
  const createAttachment = useCreateActivityAttachment()
  const deleteAttachment = useDeleteActivityAttachment()
  const { data: checklist = [] } = useActivityChecklist(activityId as UUID)
  const addChecklistItem = useAddActivityChecklistItem()
  const toggleChecklistItem = useToggleActivityChecklistItem()
  const deleteChecklistItem = useDeleteActivityChecklistItem()
  const updateActivity = useUpdateActivity()

  const [depParentId, setDepParentId] = useState('')
  const [commentText, setCommentText] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [attachmentType, setAttachmentType] = useState('application/octet-stream')
  const [attachmentSize, setAttachmentSize] = useState(0)
  const [showAddDep, setShowAddDep] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [checklistText, setChecklistText] = useState('')
  const [taskType, setTaskType] = useState<ActivityTaskType>('TASK')
  const [priority, setPriority] = useState<ActivityPriority>('NORMAL')
  const [dueDate, setDueDate] = useState('')

  const canDelete = canEditActivity(role)

  const handleDelete = async () => {
    if (!activityId) return
    try {
      await deleteActivity.mutateAsync(activityId as UUID)
      toast.success('Activity deleted')
      navigate(ROUTES.ACTIVITIES)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete activity')
    }
  }

  const handleAddDependency = async () => {
    if (!activityId || !depParentId) return
    try {
      await addDependency.mutateAsync({ childId: activityId as UUID, parentId: depParentId as UUID })
      toast.success('Dependency added')
      setDepParentId('')
      setShowAddDep(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add dependency')
    }
  }

  const handleRemoveDependency = async (parentId: string) => {
    if (!activityId) return
    try {
      await removeDependency.mutateAsync({ childId: activityId as UUID, parentId: parentId as UUID })
      toast.success('Dependency removed')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove dependency')
    }
  }

  const handleCreateComment = async () => {
    if (!activityId || !commentText.trim()) return
    try {
      await createComment.mutateAsync({
        activityId: activityId as UUID,
        data: {
          content: commentText.trim(),
          mentionMembershipIds: mentionIds.length > 0 ? mentionIds : undefined,
        },
      })
      setCommentText('')
      setMentionIds([])
      setMentionQuery('')
      toast.success('Comentário publicado')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao comentar')
    }
  }

  const handleMentionSelect = (candidate: MentionCandidate) => {
    if (!mentionIds.includes(candidate.membershipId)) {
      setMentionIds((prev) => [...prev, candidate.membershipId])
    }
    const atIndex = commentText.lastIndexOf('@')
    setCommentText(
      atIndex >= 0
        ? `${commentText.slice(0, atIndex)}@${candidate.displayName} `
        : `${commentText}@${candidate.displayName} `
    )
    setMentionQuery('')
  }

  const handleCommentTextChange = (value: string) => {
    setCommentText(value)
    const atIndex = value.lastIndexOf('@')
    if (atIndex >= 0 && !/\s/.test(value[atIndex + 1] ?? '')) {
      setMentionQuery(value.slice(atIndex + 1).trim())
    } else {
      setMentionQuery('')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!activityId) return
    try {
      await deleteComment.mutateAsync({ activityId: activityId as UUID, commentId: commentId as UUID })
      toast.success('Comentário removido')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover comentário')
    }
  }

  const handleCreateAttachment = async () => {
    if (!activityId || !attachmentName.trim() || !attachmentUrl.trim()) return
    const safeUrl = safeHttpsUrl(attachmentUrl.trim())
    if (!safeUrl) {
      toast.error('Informe uma URL HTTPS válida')
      return
    }
    try {
      await createAttachment.mutateAsync({
        activityId: activityId as UUID,
        data: {
          fileName: attachmentName.trim(),
          contentType: attachmentType.trim() || 'application/octet-stream',
          sizeBytes: attachmentSize,
          url: safeUrl,
        },
      })
      setAttachmentName('')
      setAttachmentUrl('')
      setAttachmentType('application/octet-stream')
      setAttachmentSize(0)
      toast.success('Anexo registrado')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao registrar anexo')
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!activityId) return
    try {
      await deleteAttachment.mutateAsync({ activityId: activityId as UUID, attachmentId: attachmentId as UUID })
      toast.success('Anexo removido')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover anexo')
    }
  }

  const projectName = projects?.find((p) => p.id === activity?.projectId)?.name ?? 'Unknown'
  const memberName = (id: string) => members?.find((m) => m.id === id)?.username ?? id

  const handleAddChecklist = async () => {
    if (!activityId || !checklistText.trim()) return
    try {
      await addChecklistItem.mutateAsync({ activityId: activityId as UUID, title: checklistText.trim() })
      setChecklistText('')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao adicionar item')
    }
  }

  const handleToggleChecklist = async (itemId: string) => {
    if (!activityId) return
    try {
      await toggleChecklistItem.mutateAsync({ activityId: activityId as UUID, itemId: itemId as UUID })
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao atualizar item')
    }
  }

  const handleDeleteChecklist = async (itemId: string) => {
    if (!activityId) return
    try {
      await deleteChecklistItem.mutateAsync({ activityId: activityId as UUID, itemId: itemId as UUID })
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover item')
    }
  }

  const handleSaveTaskFields = async () => {
    if (!activityId) return
    try {
      await updateActivity.mutateAsync({
        activityId: activityId as UUID,
        data: {
          taskType,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          expectedVersion: activity?.version,
        },
      })
      toast.success('Campos da tarefa atualizados')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao atualizar tarefa')
    }
  }

  useEffect(() => {
    if (activity) {
      setTaskType(activity.taskType ?? 'TASK')
      setPriority(activity.priority ?? 'NORMAL')
      setDueDate(activity.dueDate ? activity.dueDate.slice(0, 10) : '')
    }
  }, [activity])

  const dependencies = useMemo(() => {
    if (!activity) return []
    const parents = (activity.parentIds ?? []).map((parentId) => ({
      id: `${activity.id}-dep-${parentId}`,
      parentActivityId: parentId,
      childActivityId: activity.id,
    }))
    const children = (allActivities ?? [])
      .filter((a) => a.id !== activity.id && (a.parentIds ?? []).includes(activity.id))
      .map((a) => ({
        id: `${a.id}-dep-${activity.id}`,
        parentActivityId: activity.id,
        childActivityId: a.id,
      }))
    return [...parents, ...children]
  }, [activity, allActivities])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Atividade não encontrada" description="A atividade não pôde ser carregada." />
        <EmptyState icon={Clock} title="Atividade não encontrada" description={error?.message ?? 'Esta atividade não existe.'} />
      </div>
    )
  }

  const candidateParents = allActivities?.filter((a) => a.id !== activityId) ?? []

  return (
    <motion.div className="flex flex-col gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={activity.title}
        description={`${projectName} — ${formatDateTime(activity.startDatetime)}`}
      >
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1.5 size-4" /> Voltar
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <Card>
            <CardHeader><CardTitle>Descrição</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{activity.description || 'Nenhuma descrição fornecida.'}</p>
            </CardContent>
          </Card>

          {/* Time */}
          <Card>
            <CardHeader><CardTitle>Horário</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Início</p>
                  <p className="text-sm font-medium">{formatDateTime(activity.startDatetime)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fim</p>
                  <p className="text-sm font-medium">{formatDateTime(activity.endDatetime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task type / priority / due date */}
          <Card>
            <CardHeader><CardTitle>Tipo, prioridade e prazo</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Select
                  label="Tipo"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as ActivityTaskType)}
                  options={[
                    { value: 'TASK', label: 'Tarefa' },
                    { value: 'BUG', label: 'Bug' },
                    { value: 'IMPROVEMENT', label: 'Melhoria' },
                    { value: 'SUPPORT', label: 'Suporte' },
                    { value: 'MEETING', label: 'Reunião' },
                    { value: 'MILESTONE', label: 'Marco' },
                  ]}
                />
                <Select
                  label="Prioridade"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ActivityPriority)}
                  options={[
                    { value: 'LOW', label: 'Baixa' },
                    { value: 'NORMAL', label: 'Normal' },
                    { value: 'HIGH', label: 'Alta' },
                    { value: 'URGENT', label: 'Urgente' },
                  ]}
                />
                <Input
                  label="Prazo"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={priority === 'URGENT' ? 'destructive' : priority === 'HIGH' ? 'warning' : 'secondary'}>
                    {priorityLabel(activity.priority)}
                  </Badge>
                  <Badge variant="outline">{taskTypeLabel(activity.taskType)}</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={handleSaveTaskFields} disabled={updateActivity.isPending}>
                  Salvar campos
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="size-4 text-muted-foreground" />
                Checklist ({checklist.filter((item) => item.completed).length}/{checklist.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar item..."
                  value={checklistText}
                  onChange={(e) => setChecklistText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                />
                <Button size="icon" variant="outline" onClick={handleAddChecklist} disabled={!checklistText.trim() || addChecklistItem.isPending}>
                  <Plus className="size-4" />
                </Button>
              </div>
              {checklist.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">Nenhum item no checklist.</p>
              ) : (
                <div className="space-y-2">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklist(item.id)}
                        className="size-4 accent-primary"
                      />
                      <span className={`flex-1 text-sm ${item.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {item.title}
                      </span>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => handleDeleteChecklist(item.id)}>
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dependencies */}
          <DependencyTree
            activity={activity}
            allActivities={allActivities ?? []}
            dependencies={dependencies}
            onActivityClick={(id) => navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: id }))}
            onAddDependency={() => setShowAddDep(true)}
            onRemoveDependency={handleRemoveDependency}
          />

          {/* Add Dependency Dialog */}
          {showAddDep && (
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 text-sm font-medium">Adicionar dependência pai</p>
                <div className="flex items-center gap-2">
                  <Select
                    value={depParentId}
                    onChange={(e) => setDepParentId(e.target.value)}
                    placeholder="Selecione a atividade..."
                    options={candidateParents.map((a) => ({ value: a.id, label: a.title }))}
                  />
                  <Button size="sm" onClick={handleAddDependency} disabled={!depParentId || addDependency.isPending}>
                    {addDependency.isPending ? <Loader2 className="size-3 animate-spin" /> : <Link2 className="size-3" />}
                    Adicionar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddDep(false)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="size-4" /> Atividade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Textarea
                    label="Novo comentário"
                    placeholder="Escreva uma atualização, decisão ou bloqueio... Use @ para mencionar."
                    value={commentText}
                    onChange={(event) => handleCommentTextChange(event.target.value)}
                  />
                  {mentionQuery.length >= 1 && mentionCandidates.length > 0 && (
                    <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg" aria-label="Membros para mencionar">
                      {mentionCandidates.map((candidate) => (
                        <li key={candidate.membershipId}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                            onClick={() => handleMentionSelect(candidate)}
                          >
                            {candidate.avatarUrl ? (
                              <Avatar className="size-5"><AvatarImage src={candidate.avatarUrl} alt="" /><AvatarFallback>@</AvatarFallback></Avatar>
                            ) : (
                              <span className="size-5 rounded-full bg-muted text-center text-[10px] leading-5">@</span>
                            )}
                            <span className="truncate">{candidate.displayName}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {mentionIds.length > 0 && (
                  <div className="flex flex-wrap gap-1" aria-label="Menções selecionadas">
                    {mentionIds.map((id) => (
                      <Badge key={id} variant="secondary" className="gap-1 text-xs">
                        {id.slice(0, 8)}
                        <button
                          type="button"
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setMentionIds((prev) => prev.filter((m) => m !== id))}
                          aria-label="Remover menção"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Button size="sm" onClick={handleCreateComment} disabled={!commentText.trim() || createComment.isPending}>
                  {createComment.isPending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                  Publicar
                </Button>
              </div>
              <div className="space-y-3">
                {feed.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
                ) : feed.map((item) => (
                  <FeedItem key={item.id} item={item} onDelete={() => handleDeleteComment(item.commentId as string)} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Paperclip className="size-4" /> Anexos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input label="Nome do arquivo" value={attachmentName} onChange={(e) => setAttachmentName(e.target.value)} placeholder="briefing.pdf" />
                <Input label="URL segura" type="url" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="https://..." />
                <Input label="MIME type" value={attachmentType} onChange={(e) => setAttachmentType(e.target.value)} />
                <Input label="Tamanho (bytes)" type="number" min={0} value={attachmentSize} onChange={(e) => setAttachmentSize(Number(e.target.value))} />
              </div>
              <Button size="sm" onClick={handleCreateAttachment} disabled={!attachmentName.trim() || !attachmentUrl.trim() || createAttachment.isPending}>
                {createAttachment.isPending ? <Loader2 className="size-3 animate-spin" /> : <Paperclip className="size-3" />}
                Registrar anexo
              </Button>
              <div className="space-y-2">
                {attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum anexo registrado.</p>
                ) : attachments.map((attachment) => {
                  const safeUrl = safeHttpsUrl(attachment.url)
                  return (
                  <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div className="min-w-0">
                      {safeUrl ? (
                        <a className="flex items-center gap-1 truncate text-sm font-medium text-primary hover:underline" href={safeUrl} target="_blank" rel="noopener noreferrer">
                          {attachment.fileName} <ExternalLink className="size-3" />
                        </a>
                      ) : <span className="truncate text-sm font-medium text-muted-foreground">{attachment.fileName}</span>}
                      <p className="text-xs text-muted-foreground">{attachment.contentType} • {attachment.sizeBytes} bytes • {attachment.uploadedByName}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteAttachment(attachment.id)}>
                      Remover
                    </Button>
                  </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FolderKanban className="size-4" /> Projeto
                </span>
                <span className="text-sm font-medium">{projectName}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="size-4" /> Responsável
                </span>
                <span className="text-sm font-medium">{memberName(activity.assignedTo)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" /> Peso
                </span>
                <span className={`inline-flex size-7 items-center justify-center rounded-md border text-xs font-medium ${weightConfig[activity.weight]?.badge}`}>
                  {activity.weight}
                </span>
              </div>
              <Separator />
            </CardContent>
          </Card>

          {/* Delete */}
          {canDelete && (
            <Card>
              <CardContent className="p-4">
                {!confirmDelete ? (
                  <Button variant="destructive" className="w-full" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="mr-1.5 size-4" /> Excluir Atividade
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-destructive">Tem certeza?</p>
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" className="flex-1" onClick={handleDelete}>
                        {deleteActivity.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Confirmar'}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmDelete(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const EVENT_LABELS: Record<ActivityFeedEventType, string> = {
  COMMENT_CREATED: 'comentou',
  COMMENT_DELETED: 'removeu um comentário',
  ASSIGNEE_CHANGED: 'alterou o responsável',
  STATUS_CHANGED: 'alterou o status',
  DUE_DATE_CHANGED: 'alterou o prazo',
}

function FeedItem({ item, onDelete }: { item: ActivityFeedItem; onDelete: () => void }) {
  const isComment = item.type === 'COMMENT_CREATED' || item.type === 'COMMENT_DELETED'
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">
          {item.actorDisplayName ?? 'Sistema'} <span className="font-normal text-muted-foreground">{EVENT_LABELS[item.type]}</span>
        </span>
        <span className="text-[10px] text-muted-foreground">{formatDateTime(item.createdAt)}</span>
      </div>
      {isComment && item.commentContent != null && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.commentContent}</p>
      )}
      {!isComment && (item.oldValue || item.newValue) && (
        <p className="text-sm text-muted-foreground">
          <span className="text-muted-foreground/70">{item.oldValue || '—'}</span>
          {' → '}
          <span className="font-medium text-foreground">{item.newValue || '—'}</span>
        </p>
      )}
      {item.mentions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {item.mentions.map((mention) => (
            <Badge key={mention.membershipId} variant="outline" className="text-[10px]">@ {mention.displayName}</Badge>
          ))}
        </div>
      )}
      {isComment && item.canDelete && (
        <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs text-destructive" onClick={onDelete}>
          Remover
        </Button>
      )}
    </div>
  )
}
