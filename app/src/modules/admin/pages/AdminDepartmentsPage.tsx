import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Building2,
  Plus,
  Trash2,
  Users,
  Users2,
  FolderKanban,
  UserCog,
  Loader2,
  Search,
  ArrowUpRight,
} from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { useDepartments, useCreateDepartment, useDeleteDepartment, useUpdateDepartment, useProjects, useMemberships, useChangeMembershipRole } from '@/core/api/hooks'
import { canManageOrganization } from '@/core/auth/permissions'
import { ROUTES } from '@/core/config/routes'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { StatCard } from '@/shared/components/charts/StatCard'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Avatar, AvatarFallback } from '@/shared/components/ui/Avatar'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/Dialog'
import { Modal } from '@/shared/components/ui/Modal'
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert'
import { formatDate } from '@/shared/lib/formatters'
import { toast } from 'sonner'
import type { UUID, MembershipResponse } from '@/core/api/types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function AdminDepartmentsPage() {
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null
  const navigate = useNavigate()

  const { data: departments, isLoading: deptLoading, error: deptError } = useDepartments(orgId as UUID)
  const { data: memberships } = useMemberships(orgId as UUID)
  const { data: projects = [] } = useProjects(orgId as UUID)
  const createDept = useCreateDepartment()
  const deleteDept = useDeleteDepartment()
  const updateDept = useUpdateDepartment()
  const changeRole = useChangeMembershipRole()

  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
  const [chefTargetDeptId, setChefTargetDeptId] = useState<string | null>(null)
  const [chefMemberId, setChefMemberId] = useState('')

  const canCreate = canManageOrganization(role)

  const sortedDepartments = useMemo(() => {
    const list = [...(departments ?? [])]
    return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [departments])

  const filteredDepartments = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sortedDepartments
    return sortedDepartments.filter((d) => d.name.toLowerCase().includes(q))
  }, [sortedDepartments, search])

  const memberName = (m: MembershipResponse) => m.customUsername || m.username || m.email

  const getInitials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  const membersOf = (deptId: string) =>
    memberships?.filter((m) => m.primaryDepartmentId === deptId) ?? []

  const memberCount = (deptId: string) => membersOf(deptId).length

  const projectCount = (deptId: string) =>
    projects.filter((project) => project.departmentId === deptId).length

  const chefsOf = (deptId: string) => membersOf(deptId).filter((m) => m.role === 'manager')

  const chefCandidates = (deptId: string) => membersOf(deptId).filter((m) => m.role !== 'admin')

  const goToProjects = (deptId: string) => {
    navigate(`${ROUTES.ADMIN.PROJECTS}?departmentId=${deptId}`)
  }

  const handleCreate = async () => {
    if (!newName.trim() || !orgId) return
    try {
      if (editingDeptId) {
        await updateDept.mutateAsync({ orgId: orgId as UUID, deptId: editingDeptId as UUID, name: newName.trim() })
        toast.success('Departamento atualizado')
      } else {
        await createDept.mutateAsync({ orgId: orgId as UUID, data: { name: newName.trim() } })
        toast.success('Departamento criado')
      }
      setNewName('')
      setEditingDeptId(null)
      setIsDialogOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar departamento')
    }
  }

  const handleDefineChef = async () => {
    if (!chefTargetDeptId || !chefMemberId || !orgId) return
    try {
      await changeRole.mutateAsync({
        orgId: orgId as UUID,
        membershipId: chefMemberId as UUID,
        data: { role: 'manager', departmentId: chefTargetDeptId as UUID },
      })
      toast.success('Chefe do setor definido')
      setChefTargetDeptId(null)
      setChefMemberId('')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao definir o chefe do setor')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !orgId) return
    try {
      await deleteDept.mutateAsync({ orgId: orgId as UUID, deptId: deleteTarget as UUID })
      toast.success('Departamento removido')
      setDeleteTarget(null)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover departamento')
    }
  }

  if (deptLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    )
  }

  if (deptError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Departamentos" description="Gerenciar setores da organização" />
        <EmptyState icon={Building2} title="Falha ao carregar departamentos" description={deptError.message} />
      </div>
    )
  }

  const chefCandidatesList = chefTargetDeptId ? chefCandidates(chefTargetDeptId) : []

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader title="Departamentos" description="Gerenciar setores da organização">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar setores..."
            aria-label="Buscar setores"
            className="w-48 pl-8"
          />
        </div>
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingDeptId(null) }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                Novo Departamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDeptId ? 'Editar Departamento' : 'Criar Departamento'}</DialogTitle>
                <DialogDescription>Adicione um novo departamento à organização.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Nome do departamento"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={!newName.trim() || createDept.isPending}>
                  {createDept.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {editingDeptId ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={containerVariants}>
        <motion.div variants={itemVariants}>
          <StatCard value={departments?.length ?? 0} label="Departamentos" icon={Building2} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={projects.length} label="Projetos" icon={FolderKanban} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={memberships?.length ?? 0} label="Membros" icon={Users} />
        </motion.div>
      </motion.div>

      {departments?.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhum departamento ainda"
          description="Crie seu primeiro departamento para organizar suas equipes."
          actionLabel="Novo Departamento"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : filteredDepartments.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum setor encontrado"
          description={`Nenhum setor corresponde a "${search}".`}
        />
      ) : (
        <motion.div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" variants={containerVariants}>
          {filteredDepartments.map((dept) => {
            const chefs = chefsOf(dept.id)
            const deptMembers = membersOf(dept.id)
            const projectsInDept = projectCount(dept.id)
            return (
              <motion.div key={dept.id} variants={itemVariants} layout>
                <Card
                  className="group relative cursor-pointer overflow-hidden transition-all hover:border-primary/30 hover:shadow-md"
                  onClick={() => goToProjects(dept.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      goToProjects(dept.id)
                    }
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{dept.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Criado em {formatDate(dept.createdAt)}</p>
                      </div>
                      {canCreate && (
                        <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setEditingDeptId(dept.id); setNewName(dept.name); setIsDialogOpen(true) }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(dept.id) }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <UserCog className="size-3.5" />
                        Chefe do setor
                      </div>
                      {chefs.length > 0 ? (
                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                          {chefs.map((chef) => (
                            <li key={chef.id} className="flex items-center gap-1.5 rounded-full bg-primary/10 py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-primary">
                              <Avatar className="size-5">
                                <AvatarFallback>{getInitials(memberName(chef))}</AvatarFallback>
                              </Avatar>
                              <span>{memberName(chef)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1.5 text-xs text-muted-foreground">Sem chefe definido</p>
                      )}
                      {canCreate && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={(e) => { e.stopPropagation(); setChefTargetDeptId(dept.id); setChefMemberId('') }}
                        >
                          <UserCog className="mr-1 size-3.5" />
                          Definir chefe
                        </Button>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); goToProjects(dept.id) }}
                        className="flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:text-primary"
                      >
                        <FolderKanban className="size-3.5" />
                        {projectsInDept} {projectsInDept === 1 ? 'projeto' : 'projetos'}
                        <ArrowUpRight className="size-3 opacity-60" />
                      </button>
                      <div className="flex items-center gap-1.5">
                        {deptMembers.length > 0 && (
                          <div className="flex -space-x-2">
                            {deptMembers.slice(0, 4).map((m) => (
                              <Avatar key={m.id} className="size-6 ring-2 ring-card">
                                <AvatarFallback className="text-[9px]">{getInitials(memberName(m))}</AvatarFallback>
                              </Avatar>
                            ))}
                            {deptMembers.length > 4 && (
                              <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card">
                                +{deptMembers.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                        <span className="flex items-center gap-1">
                          <Users2 className="size-3.5" />
                          {deptMembers.length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      <Dialog open={!!chefTargetDeptId} onOpenChange={(open) => { if (!open) setChefTargetDeptId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir chefe do setor</DialogTitle>
            <DialogDescription>
              {departments?.find((d) => d.id === chefTargetDeptId)?.name ?? ''} — o colaborador escolhido passará a gerenciar este setor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {chefCandidatesList.length > 0 ? (
              <Select
                label="Colaborador"
                value={chefMemberId}
                onChange={(e) => setChefMemberId(e.target.value)}
                placeholder="Selecione o colaborador do setor"
                options={chefCandidatesList.map((m) => ({
                  value: m.id,
                  label: memberName(m),
                }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum colaborador disponível neste setor.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChefTargetDeptId(null)}>
              Cancelar
            </Button>
            <Button onClick={handleDefineChef} disabled={!chefMemberId || changeRole.isPending}>
              {changeRole.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Definir chefe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <Alert variant="destructive">
          <AlertTitle>Remover departamento?</AlertTitle>
          <AlertDescription>Esta ação não pode ser desfeita.</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteDept.isPending}>
            {deleteDept.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Remover
          </Button>
        </div>
      </Modal>
    </motion.div>
  )
}
