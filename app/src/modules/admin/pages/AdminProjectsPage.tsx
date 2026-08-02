import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { FolderKanban, Plus, Trash2, MoreHorizontal, Power, PowerOff, Loader2 } from 'lucide-react'
import { canManageOrganization, canManageDepartment } from '@/core/auth/permissions'
import { useAuthStore } from '@/core/auth/authStore'
import { useProjects, useDepartments, useMemberships, useClients, useCreateProject, useDeleteProject, useUpdateProject } from '@/core/api/hooks'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Badge } from '@/shared/components/ui/Badge'
import { Textarea } from '@/shared/components/ui/Textarea'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/Dialog'
import { Select } from '@/shared/components/ui/Select'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/Tabs'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/components/ui/DropdownMenu'
import { Modal } from '@/shared/components/ui/Modal'
import { DataTable, type DataTableColumn } from '@/shared/components/ui/DataTable'
import { formatDate } from '@/shared/lib/formatters'
import { toast } from 'sonner'
import type { UUID, ProjectResponse } from '@/core/api/types'

export default function AdminProjectsPage() {
  const role = useAuthStore((s) => s.activeOrg?.role)
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { data: projects = [] } = useProjects(orgId as UUID)
  const { data: departments = [] } = useDepartments(orgId as UUID)
  const { data: members = [] } = useMemberships(orgId as UUID)
  const { data: clients = [] } = useClients(orgId as UUID)
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const updateProject = useUpdateProject()

  const canCreate = role ? canManageOrganization(role) || canManageDepartment(role) : false

  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDept, setFormDept] = useState('')
  const [formManager, setFormManager] = useState('')
  const [formClient, setFormClient] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectResponse | null>(null)

  const getDeptName = (id: string) => departments.find((d) => d.id === id)?.name ?? '-'
  const getMemberName = (id: string) => members.find((m) => m.id === id)?.username ?? '-'

  const managerOptions = members.map((m) => ({
    value: m.id,
    label: `${m.username} (${m.email})`,
  }))

  const filtered = useMemo(() => {
    let list = projects
    if (deptFilter !== 'all') {
      list = list.filter((p) => p.departmentId === deptFilter)
    }
    if (statusFilter === 'active') {
      list = list.filter((p) => p.isActive)
    } else if (statusFilter === 'inactive') {
      list = list.filter((p) => !p.isActive)
    }
    return list
  }, [projects, deptFilter, statusFilter])

  async function handleCreate() {
    if (!formName.trim() || !formDept || !formManager) return
    try {
      await createProject.mutateAsync({
        deptId: formDept as UUID,
        data: {
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          managerMembershipId: formManager as UUID,
          clientId: formClient || undefined,
        },
      })
      toast.success('Projeto criado')
      setFormName('')
      setFormDesc('')
      setFormDept('')
      setFormManager('')
      setFormClient('')
      setCreateOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao criar projeto')
    }
  }

  async function handleToggleActive(project: ProjectResponse) {
    try {
      await updateProject.mutateAsync({ projectId: project.id, data: { isActive: !project.isActive } })
      toast.success(project.isActive ? 'Projeto desativado' : 'Projeto ativado')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao atualizar projeto')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteProject.mutateAsync(deleteTarget.id)
      toast.success('Projeto removido')
      setDeleteOpen(false)
      setDeleteTarget(null)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover projeto')
    }
  }

  const columns: DataTableColumn<ProjectResponse>[] = [
    {
      key: 'name',
      header: 'Projeto',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <FolderKanban className="size-4" />
          </div>
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            {row.description && (
              <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                {row.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Departamento',
      render: (row) => (
        <Badge variant="secondary" className="text-xs">
          {getDeptName(row.departmentId)}
        </Badge>
      ),
    },
    {
      key: 'manager',
      header: 'Responsável',
      render: (row) => (
        <span className="text-sm text-foreground">{getMemberName(row.managerMembershipId)}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'secondary'} className="text-xs">
          {row.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      render: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleToggleActive(row)}>
              {row.isActive ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
              {row.isActive ? 'Desativar' : 'Ativar'}
            </DropdownMenuItem>
            {canCreate && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  setDeleteTarget(row)
                  setDeleteOpen(true)
                }}
              >
                <Trash2 className="size-3.5" />
                Remover
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Projetos" description="Gerenciar projetos da organização">
        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger>
              <Button>
                <Plus className="size-4" />
                Criar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Criar Projeto</DialogTitle>
                <DialogDescription>
                  Adicione um novo projeto à organização.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  label="Nome do projeto"
                  placeholder="Ex: Plataforma Core"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
                <Textarea
                  label="Descrição"
                  placeholder="Descrição do projeto..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
                <Select
                  label="Departamento"
                  options={departments.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Selecione um departamento"
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                />
                <Select
                  label="Responsável"
                  options={managerOptions}
                  placeholder="Selecione um membro"
                  value={formManager}
                  onChange={(e) => setFormManager(e.target.value)}
                />
                <Select
                  label="Unidade solicitante"
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Selecione quem demandou o projeto (opcional)"
                  value={formClient}
                  onChange={(e) => setFormClient(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!formName.trim() || !formDept || !formManager || createProject.isPending}
                >
                  {createProject.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={deptFilter} onValueChange={setDeptFilter} defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            {departments.map((d) => (
              <TabsTrigger key={d.id} value={d.id}>
                {d.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="inactive">Inativos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        keyExtractor={(row) => row.id}
        emptyTitle="Nenhum projeto encontrado"
        emptyDescription="Tente ajustar os filtros selecionados."
      />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remover Projeto"
        description={`Tem certeza que deseja remover o projeto "${deleteTarget?.name ?? ''}"? Esta ação não pode ser desfeita.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteProject.isPending}>
            {deleteProject.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Remover
          </Button>
        </div>
      </Modal>
    </div>
  )
}
