import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, ClipboardList, Filter, FolderKanban, GitBranch, Loader2, Plus, Search, Trash2, Users2 } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { useDepartments, useMemberships, useProjects, useRequests, useCreateRequest, useChangeRequestStatus, useConvertRequestToProject, useDeleteRequest } from '@/core/api/hooks'
import type { InternalRequest, RequestPriority, RequestStatus, UUID } from '@/core/api/types'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Select } from '@/shared/components/ui/Select'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/components/ui/Dialog'
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

const STATUS_TONES: Record<RequestStatus, 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' | 'default'> = {
  NEW: 'secondary',
  TRIAGE: 'warning',
  PLANNED: 'outline',
  IN_PROGRESS: 'default',
  BLOCKED: 'destructive',
  DONE: 'success',
  CANCELED: 'secondary',
}

const PRIORITY_TONES: Record<RequestPriority, 'secondary' | 'warning' | 'destructive' | 'default'> = {
  LOW: 'secondary',
  NORMAL: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
}

export default function RequestsPage() {
  const navigate = useNavigate()
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null
  const role = activeOrg?.role ?? 'employee'

  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL')
  const [mineOnly, setMineOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: departments = [] } = useDepartments(orgId as UUID)
  const { data: memberships = [] } = useMemberships(orgId as UUID)
  const { data: projects = [] } = useProjects(orgId as UUID)

  const requestsQuery = useRequests(
    orgId ? { status: statusFilter === 'ALL' ? undefined : statusFilter, mine: mineOnly, size: 200 } : null,
  )
  const createRequest = useCreateRequest()
  const changeStatus = useChangeRequestStatus()
  const convertToProject = useConvertRequestToProject()
  const deleteRequest = useDeleteRequest()

  const requests = requestsQuery.data?.content ?? []
  const isLoading = requestsQuery.isLoading

  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newGlpi, setNewGlpi] = useState('')
  const [newPriority, setNewPriority] = useState<RequestPriority>('NORMAL')
  const [newRequestingDept, setNewRequestingDept] = useState('')
  const [newResponsibleDept, setNewResponsibleDept] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newAssignees, setNewAssignees] = useState<UUID[]>([])

  const filtered = useMemo(() => {
    if (!search.trim()) return requests
    const q = search.toLowerCase()
    return requests.filter(
      (r) => r.title.toLowerCase().includes(q) || r.requestKey.toLowerCase().includes(q),
    )
  }, [requests, search])

  const deptName = (id: string | null) => departments.find((d) => d.id === id)?.name ?? '—'
  const memberName = (id: string | null) => {
    if (!id) return 'Não atribuída'
    return memberships.find((m) => m.id === id)?.username ?? '—'
  }
  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? null

  const canManage = role === 'admin' || role === 'manager'

  async function handleCreate() {
    if (!newTitle.trim()) return
    try {
      await createRequest.mutateAsync({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        glpiTicketId: newGlpi.trim() || undefined,
        priority: newPriority,
        requestingDepartmentId: newRequestingDept ? (newRequestingDept as UUID) : undefined,
        responsibleDepartmentId: newResponsibleDept ? (newResponsibleDept as UUID) : undefined,
        desiredDueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        assigneeMembershipIds: newAssignees.length > 0 ? newAssignees : undefined,
      })
      toast.success('Demanda criada')
      setNewTitle('')
      setNewDesc('')
      setNewGlpi('')
      setNewPriority('NORMAL')
      setNewRequestingDept('')
      setNewResponsibleDept('')
      setNewDueDate('')
      setNewAssignees([])
      setCreateOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao criar demanda')
    }
  }

  async function handleConvert(req: InternalRequest) {
    try {
      await convertToProject.mutateAsync({ requestId: req.id })
      toast.success(`Demanda ${req.requestKey} convertida em projeto`)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao converter demanda')
    }
  }

  async function handleStatus(req: InternalRequest, status: RequestStatus) {
    try {
      await changeStatus.mutateAsync({ requestId: req.id, status })
      toast.success(`Status atualizado para ${STATUS_LABELS[status]}`)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao atualizar status')
    }
  }

  async function handleDelete(req: InternalRequest) {
    if (!confirm(`Remover a demanda ${req.requestKey}?`)) return
    try {
      await deleteRequest.mutateAsync(req.id)
      toast.success('Demanda removida')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover demanda')
    }
  }

  return (
    <motion.div className="flex flex-col gap-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Demandas Internas"
        description="Pedidos de trabalho entre equipes e departamentos, com triagem e conversão em projeto ou tarefa."
      >
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Nova demanda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Demanda Interna</DialogTitle>
              <DialogDescription>Registre um pedido de trabalho para outra equipe ou departamento.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <Input
                label="Título"
                placeholder="Ex: Apoio de Infraestrutura na migração de rede"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Input
                label="Nº do chamado (GLPI)"
                placeholder="Ex: 2026081234"
                value={newGlpi}
                onChange={(e) => setNewGlpi(e.target.value)}
              />
              <Textarea
                label="Descrição"
                placeholder="Detalhes do que é necessário..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
              <Select
                label="Prioridade"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as RequestPriority)}
                options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <div>
                <span className="mb-1.5 block text-sm font-medium text-foreground">Responsáveis (pode marcar vários)</span>
                <div className="flex flex-wrap gap-2">
                  {memberships.filter((m) => m.role !== 'admin').map((m) => {
                    const active = newAssignees.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setNewAssignees((prev) => active ? prev.filter((id) => id !== m.id) : [...prev, m.id])}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        {m.customUsername || m.username}
                      </button>
                    )
                  })}
                </div>
              </div>
              <Select
                label="Equipe/área solicitante"
                value={newRequestingDept}
                onChange={(e) => setNewRequestingDept(e.target.value)}
                placeholder="Selecione (opcional)"
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
              />
              <Select
                label="Equipe/área responsável"
                value={newResponsibleDept}
                onChange={(e) => setNewResponsibleDept(e.target.value)}
                placeholder="Selecione (opcional)"
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
              />
              <Input
                label="Prazo desejado"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!newTitle.trim() || createRequest.isPending}>
                {createRequest.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Criar demanda
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Filter className="size-4 text-muted-foreground" />
            Filtros
          </div>
          <div className="flex flex-col gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'ALL')}
              options={[
                { value: 'ALL', label: 'Todos os status' },
                ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={mineOnly}
                onChange={(e) => setMineOnly(e.target.checked)}
                className="size-4 accent-primary"
              />
              Atribuídas a mim
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por título ou código" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <EmptyState
                  icon={ClipboardList}
                  title={statusFilter === 'ALL' && !mineOnly ? 'Nenhuma demanda ainda' : 'Nenhuma demanda com esses filtros'}
                  description={statusFilter === 'ALL' && !mineOnly ? 'Crie a primeira demanda interna para organizar o trabalho entre equipes.' : 'Ajuste os filtros para ver outros registros.'}
                  actionLabel="Nova demanda"
                  onAction={() => setCreateOpen(true)}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((req) => (
                <Card
                  key={req.id}
                  className="cursor-pointer transition-colors hover:border-primary/30"
                  onClick={() => navigate(buildRoute(ROUTES.REQUEST_DETAIL, { requestId: req.id }))}
                >
                  <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{req.requestKey}</span>
                        {req.glpiTicketId && (
                          <span className="font-mono text-xs text-primary" title="Chamado GLPI">GLPI #{req.glpiTicketId}</span>
                        )}
                        <Badge variant={PRIORITY_TONES[req.priority]} className="text-[10px]">{PRIORITY_LABELS[req.priority]}</Badge>
                        <Badge variant={STATUS_TONES[req.status]} className="text-[10px]">{STATUS_LABELS[req.status]}</Badge>
                      </div>
                      <h3 className="mt-1.5 truncate text-sm font-semibold text-foreground">{req.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users2 className="size-3.5" />
                          Solicitante: {deptName(req.requestingDepartmentId)}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitBranch className="size-3.5" />
                          Responsável: {deptName(req.responsibleDepartmentId)}
                        </span>
                        <span>
                          Atribuída: {req.assigneeMembershipIds?.length
                            ? req.assigneeMembershipIds.map((id) => memberName(id)).filter((n) => n !== '—').join(', ') || 'Não atribuída'
                            : memberName(req.assigneeMembershipId)}
                        </span>
                        {req.desiredDueDate && (
                          <span>Prazo: {new Date(req.desiredDueDate).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                      {projectName(req.projectId) && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-primary">
                          <FolderKanban className="size-3.5" />
                          Projeto: {projectName(req.projectId)}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {canManage && req.status !== 'DONE' && req.status !== 'CANCELED' && (
                        <>
                          {req.status === 'NEW' && (
                            <Button size="sm" variant="outline" onClick={() => handleStatus(req, 'TRIAGE')}>
                              Iniciar triagem
                            </Button>
                          )}
                          {req.status === 'TRIAGE' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleConvert(req)}>
                                Converter em projeto
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleStatus(req, 'PLANNED')}>
                                Planejar
                              </Button>
                            </>
                          )}
                          {req.status === 'PLANNED' && (
                            <Button size="sm" variant="outline" onClick={() => handleStatus(req, 'IN_PROGRESS')}>
                              Iniciar execução
                            </Button>
                          )}
                          {(req.status === 'IN_PROGRESS' || req.status === 'BLOCKED') && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleStatus(req, 'DONE')}>
                                Concluir
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleStatus(req, 'BLOCKED')}>
                                Bloquear
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(req)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
