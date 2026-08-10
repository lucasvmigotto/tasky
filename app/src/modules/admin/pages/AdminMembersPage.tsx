import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Users, Plus, UserCog, Shield, Loader2, Trash2, Mail, RotateCcw, XCircle } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { useChangeMembershipRole, useCreateMemberType, useDeleteMemberType, useDepartmentMemberTypes, useDepartments, useInviteMember, useMembershipInvitations, useMemberships, useRemoveMember, useRevokeMembershipInvitation, useUpdateMembershipSettings } from '@/core/api/hooks'
import { canManageOrganization, canInviteRole, type Role } from '@/core/auth/permissions'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { Badge } from '@/shared/components/ui/Badge'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
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
import { formatDate } from '@/shared/lib/formatters'
import { cn } from '@/shared/lib/cn'
import { toast } from 'sonner'
import type { InvitationStatus, MembershipInvitationResponse, UUID } from '@/core/api/types'

const roleColors: Record<Role, 'default' | 'secondary' | 'info' | 'success'> = {
  super_admin: 'default',
  admin: 'default',
  manager: 'info',
  employee: 'success',
}

const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin (plataforma)',
  admin: 'Administrador do órgão',
  manager: 'Chefe de setor',
  employee: 'Colaborador',
}

const invitationLabels: Record<InvitationStatus, string> = {
  PENDING: 'Pendente',
  ACCEPTED: 'Aceito',
  REVOKED: 'Revogado',
  EXPIRED: 'Expirado',
}

export default function AdminMembersPage() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { data: members, isLoading, error } = useMemberships(orgId as UUID)
  const invitationsQuery = useMembershipInvitations(orgId as UUID)
  const { data: departments = [] } = useDepartments(orgId as UUID)
  const inviteMember = useInviteMember()
  const updateSettings = useUpdateMembershipSettings()
  const removeMember = useRemoveMember()
  const changeRole = useChangeMembershipRole()
  const revokeInvitation = useRevokeMembershipInvitation()

  const isAdmin = canManageOrganization(role)

  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('employee')
  const [inviteDepartmentId, setInviteDepartmentId] = useState('')
  const [inviteMemberTypeIds, setInviteMemberTypeIds] = useState<string[]>([])
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editDailyMinutes, setEditDailyMinutes] = useState(480)
  const [editRole, setEditRole] = useState<Role>('employee')
  const [editDepartmentId, setEditDepartmentId] = useState('')
  const [editMemberTypeIds, setEditMemberTypeIds] = useState<string[]>([])
  const [typeManagementDeptId, setTypeManagementDeptId] = useState('')
  const [newMemberTypeName, setNewMemberTypeName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const canInvite = role === 'admin' || role === 'manager'
  const currentMembership = members?.find((membership) => membership.userId === user?.id)
  const availableDepartments = role === 'admin'
    ? departments
    : departments.filter((department) => department.id === currentMembership?.primaryDepartmentId)
  const inviteEffectiveDeptId = inviteDepartmentId || (role === 'manager' ? currentMembership?.primaryDepartmentId ?? '' : '')
  const memberTypesQuery = useDepartmentMemberTypes((typeManagementDeptId || inviteEffectiveDeptId || editDepartmentId || currentMembership?.primaryDepartmentId || null) as UUID | null)
  const memberTypes = memberTypesQuery.data ?? []
  const createMemberType = useCreateMemberType()
  const deleteMemberType = useDeleteMemberType()
  const getDepartmentName = (id: string | null) => departments.find((department) => department.id === id)?.name ?? 'Sem setor'
  const canManageMember = (membership: NonNullable<typeof members>[number]) => {
    if (isAdmin) return true
    if (role === 'manager') {
      return membership.primaryDepartmentId === currentMembership?.primaryDepartmentId
        && membership.role !== 'admin'
        && membership.role !== 'manager'
    }
    return false
  }

  const filtered = useMemo(() => {
    if (!members) return []
    let list = members
    if (roleFilter !== 'all') list = list.filter((m) => m.role === roleFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((m) => m.email.toLowerCase().includes(q) || m.username.toLowerCase().includes(q))
    }
    return list
  }, [members, roleFilter, search])

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !orgId) return
    const deptId = inviteRole === 'admin' ? undefined : inviteEffectiveDeptId
    if (inviteRole !== 'admin' && !deptId) {
      toast.error('Selecione o setor do membro')
      return
    }
    try {
      await inviteMember.mutateAsync({
        orgId: orgId as UUID,
        data: {
          email: inviteEmail.trim(),
          role: inviteRole,
          departmentIds: inviteRole === 'admin' ? undefined : [deptId as UUID],
          memberTypeIds: inviteMemberTypeIds.length > 0 ? inviteMemberTypeIds as UUID[] : undefined,
        },
      })
      toast.success('Pré-cadastro criado. Nenhum e-mail foi enviado; o acesso será ativado no próximo login com este endereço.')
      setInviteEmail('')
      setInviteDepartmentId('')
      setInviteMemberTypeIds([])
      setIsDialogOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao adicionar membro')
    }
  }

  async function handleCreateMemberType() {
    const departmentId = typeManagementDeptId || currentMembership?.primaryDepartmentId
    if (!departmentId || !newMemberTypeName.trim()) return
    try {
      await createMemberType.mutateAsync({ deptId: departmentId as UUID, data: { name: newMemberTypeName.trim() } })
      setNewMemberTypeName('')
      toast.success('Tipo de colaborador criado')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao criar tipo de colaborador')
    }
  }

  async function handleDeleteMemberType(memberTypeId: string) {
    const departmentId = typeManagementDeptId || currentMembership?.primaryDepartmentId
    if (!departmentId) return
    try {
      await deleteMemberType.mutateAsync({ deptId: departmentId as UUID, memberTypeId: memberTypeId as UUID })
      toast.success('Tipo de colaborador removido')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover tipo de colaborador')
    }
  }

  const handleRevokeInvitation = async (membershipId: string) => {
    if (!orgId) return
    try {
      await revokeInvitation.mutateAsync({ orgId: orgId as UUID, membershipId: membershipId as UUID })
      toast.success('Convite revogado')
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível revogar o convite')
    }
  }

  const handleReinvite = (invitation: MembershipInvitationResponse) => {
    setInviteEmail(invitation.email)
    setInviteRole(invitation.role)
    setInviteDepartmentId(invitation.primaryDepartmentId ?? '')
    setInviteMemberTypeIds([])
    setIsDialogOpen(true)
  }

  const handleUpdateSettings = async (membershipId: string) => {
    if (isAdmin && editRole !== 'admin' && !editDepartmentId) {
      toast.error('Selecione o setor do membro')
      return
    }
    try {
      await updateSettings.mutateAsync({ orgId: orgId as UUID, membershipId: membershipId as UUID, data: {
        maxDailyWorkMinutes: editDailyMinutes,
        memberTypeIds: editMemberTypeIds.length > 0 ? editMemberTypeIds as UUID[] : undefined,
      } })
      const current = members?.find((membership) => membership.id === membershipId)
      const structureChanged = current && (
        current.role !== editRole
        || (editRole !== 'admin' && current.primaryDepartmentId !== editDepartmentId)
      )
      if (isAdmin && structureChanged) {
        await changeRole.mutateAsync({
          orgId: orgId as UUID,
          membershipId: membershipId as UUID,
          data: {
            role: editRole,
            departmentId: editRole === 'admin' ? undefined : editDepartmentId as UUID,
          },
        })
      }
      toast.success('Membro atualizado')
      setEditingMember(null)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao atualizar membro')
    }
  }

  const handleRemoveMember = async (membershipId: string) => {
    if (!orgId) return
    try {
      await removeMember.mutateAsync({ orgId: orgId as UUID, membershipId: membershipId as UUID })
      toast.success('Member removed')
      setDeleteTarget(null)
      setEditingMember(null)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove member')
    }
  }

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
        <PageHeader title="Membros" description="Gerenciar membros" />
        <EmptyState icon={Users} title="Falha ao carregar membros" description={error.message} />
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader title="Membros" description="Gerenciar membros da organização">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar membros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          {canInvite && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 size-4" />
                  Adicionar membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar membro</DialogTitle>
                  <DialogDescription>Pré-cadastre o servidor. A conta será vinculada automaticamente no primeiro login institucional.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <Input
                    placeholder="Endereço de e-mail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
              <Select
                label="Função"
                value={inviteRole}
                onChange={(e) => {
                  setInviteRole(e.target.value as Role)
                  setInviteDepartmentId('')
                  setInviteMemberTypeIds([])
                }}
                    options={[
                      { value: 'admin', label: 'Administrador' },
                      { value: 'manager', label: 'Chefe de setor' },
                      { value: 'employee', label: 'Colaborador' },
                    ].filter((o) => canInviteRole(role, o.value as Role))}
                  />
                  {inviteRole !== 'admin' && (role === 'manager' ? (
                    <p className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                      Setor: <span className="font-medium text-foreground">{getDepartmentName(currentMembership?.primaryDepartmentId ?? null)}</span>
                    </p>
                  ) : (
                    <Select
                      label="Setor"
                      value={inviteDepartmentId}
                      onChange={(e) => {
                        setInviteDepartmentId(e.target.value)
                        setInviteMemberTypeIds([])
                      }}
                      placeholder="Selecione o setor"
                      options={availableDepartments.map((department) => ({ value: department.id, label: department.name }))}
                    />
                  ))}
                  {inviteRole !== 'admin' && inviteEffectiveDeptId && (
                    <div>
                      <span className="mb-1.5 block text-sm font-medium text-foreground">Funções (opcional)</span>
                      <div className="flex flex-wrap gap-1.5">
                        {memberTypes.filter((type) => type.isActive).map((type) => {
                          const active = inviteMemberTypeIds.includes(type.id)
                          return (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => setInviteMemberTypeIds((prev) =>
                                active ? prev.filter((id) => id !== type.id) : [...prev, type.id])}
                              className={cn(
                                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                active
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                              )}
                            >
                              {type.name}
                            </button>
                          )
                        })}
                        {memberTypes.filter((type) => type.isActive).length === 0 && (
                          <span className="text-xs text-muted-foreground">Nenhuma função cadastrada neste setor.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviteMember.isPending}>
                    {inviteMember.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Adicionar membro
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {['all', 'admin', 'manager', 'employee'].map((r) => (
          <Button
            key={r}
            variant={roleFilter === r ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter(r)}
          >
            {r === 'all' ? 'Todos' : roleLabels[r as Role]}
            {r !== 'all' && ` (${members?.filter((m) => m.role === r).length ?? 0})`}
          </Button>
        ))}
      </div>

      {members?.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum membro ainda" description="Convide membros para começar." />
      ) : (
        <DataTable
          columns={[
            { key: 'username', header: 'Usuário', render: (row: any) => (
              <div>
                <div className="font-medium">{row.username}</div>
                <div className="text-xs text-muted-foreground">{row.email}</div>
              </div>
            )},
            { key: 'role', header: 'Função', render: (row: any) => <Badge variant={roleColors[row.role as Role]}>{roleLabels[row.role as Role]}</Badge> },
            { key: 'primaryDepartmentId', header: 'Setor', render: (row: any) => getDepartmentName(row.primaryDepartmentId) },
             { key: 'memberTypes', header: 'Funções', render: (row: any) => (
               (row.memberTypes ?? []).length > 0
                 ? <div className="flex flex-wrap gap-1">{(row.memberTypes as Array<{name: string}>).map((t) => <Badge key={t.name} variant="secondary" className="text-[10px]">{t.name}</Badge>)}</div>
                 : <span className="text-muted-foreground/60">—</span>
             ) },
            { key: 'maxDailyWorkMinutes', header: 'Máx/dia', render: (row: any) => `${row.maxDailyWorkMinutes} min` },
            { key: 'createdAt', header: 'Desde', render: (row: any) => formatDate(row.createdAt) },
          ]}
          rows={filtered}
          keyExtractor={(row: any) => row.id}
          onRowClick={(row: any) => {
            if (!canManageMember(row) && row.userId !== user?.id) {
              toast.error('Você não pode administrar este membro')
              return
            }
            setEditingMember(row.id)
            setEditDailyMinutes(row.maxDailyWorkMinutes)
             setEditRole(row.role)
             setEditDepartmentId(row.primaryDepartmentId ?? '')
             setEditMemberTypeIds((row.memberTypes ?? []).map((t: any) => t.id))
          }}
          emptyTitle="Nenhum membro corresponde aos filtros."
        />
      )}

      {canInvite && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Tipos de colaborador</h2>
            <p className="text-sm text-muted-foreground">Cadastre títulos como Programador Backend para organizar cada setor.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Select
              label="Departamento"
              value={typeManagementDeptId || currentMembership?.primaryDepartmentId || ''}
              onChange={(e) => setTypeManagementDeptId(e.target.value)}
              options={availableDepartments.map((department) => ({ value: department.id, label: department.name }))}
              placeholder="Selecione o departamento"
            />
            <Input
              label="Novo tipo"
              placeholder="Ex.: Programador Backend"
              value={newMemberTypeName}
              onChange={(e) => setNewMemberTypeName(e.target.value)}
            />
            <Button onClick={handleCreateMemberType} disabled={!newMemberTypeName.trim() || createMemberType.isPending}>
              {createMemberType.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Criar tipo
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {memberTypes.filter((type) => type.isActive).map((type) => (
              <Badge key={type.id} variant="secondary" className="gap-2 pr-1">
                {type.name}
                <button type="button" aria-label={`Remover ${type.name}`} onClick={() => handleDeleteMemberType(type.id)} className="rounded px-1 text-muted-foreground hover:text-destructive">×</button>
              </Badge>
            ))}
            {memberTypes.length === 0 && <span className="text-xs text-muted-foreground">Nenhum tipo cadastrado neste departamento.</span>}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Mail className="size-5" />Convites e pré-cadastros</h2>
          <p className="text-sm text-muted-foreground">Acompanhe ativações, expirações e revogações.</p>
        </div>
        {invitationsQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : invitationsQuery.isError ? (
          <EmptyState icon={Mail} title="Falha ao carregar convites" description={invitationsQuery.error.message} />
        ) : (
          <DataTable
            className="overflow-x-auto"
            rows={(invitationsQuery.data ?? []).filter((invitation) => !search || invitation.email.toLowerCase().includes(search.toLowerCase()))}
            keyExtractor={(invitation) => invitation.id}
            emptyTitle="Nenhum convite registrado"
            emptyDescription="Os próximos pré-cadastros aparecerão aqui."
            columns={[
              { key: 'email', header: 'E-mail', className: 'min-w-56' },
              { key: 'role', header: 'Função', render: (invitation) => <Badge variant={roleColors[invitation.role]}>{roleLabels[invitation.role]}</Badge> },
              { key: 'primaryDepartmentId', header: 'Setor', render: (invitation) => getDepartmentName(invitation.primaryDepartmentId) },
              { key: 'status', header: 'Status', render: (invitation) => <Badge variant={invitation.status === 'PENDING' ? 'warning' : invitation.status === 'ACCEPTED' ? 'success' : 'secondary'}>{invitationLabels[invitation.status]}</Badge> },
              { key: 'expiresAt', header: 'Validade', render: (invitation) => invitation.expiresAt ? formatDate(invitation.expiresAt) : '—' },
              { key: 'actions', header: 'Ações', render: (invitation) => invitation.status === 'PENDING' ? (
                <Button size="sm" variant="outline" disabled={revokeInvitation.isPending} onClick={() => handleRevokeInvitation(invitation.id)}><XCircle className="size-4" />Revogar</Button>
              ) : invitation.status === 'REVOKED' || invitation.status === 'EXPIRED' ? (
                <Button size="sm" variant="outline" onClick={() => handleReinvite(invitation)}><RotateCcw className="size-4" />Convidar novamente</Button>
              ) : <span className="text-xs text-muted-foreground">Ativado</span> },
            ]}
          />
        )}
      </div>

      <Dialog open={!!editingMember} onOpenChange={(o) => !o && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações do Membro</DialogTitle>
            <DialogDescription>Atualize a configuração do membro.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input
              label="Limite diário (minutos)"
              type="number"
              min={1}
              max={1440}
              value={editDailyMinutes}
              onChange={(e) => setEditDailyMinutes(Number(e.target.value))}
            />
            {isAdmin && (
              <Select
                label="Função"
                value={editRole}
                onChange={(e) => {
                  setEditRole(e.target.value as Role)
                  setEditDepartmentId('')
                  setEditMemberTypeIds([])
                }}
                options={[
                  { value: 'admin', label: 'Administrador' },
                  { value: 'manager', label: 'Chefe de setor' },
                  { value: 'employee', label: 'Colaborador' },
                ]}
              />
            )}
            {isAdmin && editRole !== 'admin' && (
              <Select
                label="Setor"
                value={editDepartmentId}
                onChange={(e) => {
                    setEditDepartmentId(e.target.value)
                    setEditMemberTypeIds([])
                }}
                placeholder="Selecione o setor"
                options={departments.map((department) => ({ value: department.id, label: department.name }))}
              />
            )}
            {editDepartmentId && (
              <div>
                <span className="mb-1.5 block text-sm font-medium text-foreground">Funções (opcional)</span>
                <div className="flex flex-wrap gap-1.5">
                  {memberTypes.filter((type) => type.isActive).map((type) => {
                    const active = editMemberTypeIds.includes(type.id)
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setEditMemberTypeIds((prev) =>
                          active ? prev.filter((id) => id !== type.id) : [...prev, type.id])}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                        )}
                      >
                        {type.name}
                      </button>
                    )
                  })}
                  {memberTypes.filter((type) => type.isActive).length === 0 && (
                    <span className="text-xs text-muted-foreground">Nenhuma função cadastrada neste setor.</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="justify-between">
            {editingMember && members?.find((membership) => membership.id === editingMember && canManageMember(membership)) ? (
              <Button
                variant="destructive"
                onClick={() => handleRemoveMember(editingMember)}
                disabled={removeMember.isPending}
              >
                {removeMember.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Remover
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingMember(null)}>Cancelar</Button>
              <Button onClick={() => editingMember && handleUpdateSettings(editingMember)}>
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
