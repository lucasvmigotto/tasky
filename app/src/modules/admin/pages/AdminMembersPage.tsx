import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Users, Plus, UserCog, Shield, Loader2, Trash2, Mail, RotateCcw, XCircle } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { useAllTeams, useChangeMembershipRole, useDepartments, useInviteMember, useMembershipInvitations, useMemberships, useRemoveMember, useRevokeMembershipInvitation, useUpdateMembershipSettings } from '@/core/api/hooks'
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
import { toast } from 'sonner'
import type { InvitationStatus, MembershipInvitationResponse, UUID } from '@/core/api/types'

const roleColors: Record<Role, 'default' | 'secondary' | 'info' | 'success'> = {
  admin: 'default',
  manager: 'info',
  leader: 'secondary',
  employee: 'success',
}

const roleLabels: Record<Role, string> = {
  admin: 'Administrador do órgão',
  manager: 'Chefe de setor',
  leader: 'Líder de equipe',
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
  const departmentIds = useMemo(() => departments.map((department) => department.id as UUID), [departments])
  const teamQueries = useAllTeams(departmentIds)
  const teams = useMemo(() => teamQueries.flatMap((query) => query.data ?? []), [teamQueries])
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
  const [inviteTeamId, setInviteTeamId] = useState('')
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editDailyMinutes, setEditDailyMinutes] = useState(480)
  const [editRole, setEditRole] = useState<Role>('employee')
  const [editDepartmentId, setEditDepartmentId] = useState('')
  const [editTeamId, setEditTeamId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const canInvite = role === 'admin' || role === 'manager' || role === 'leader'
  const currentMembership = members?.find((membership) => membership.userId === user?.id)
  const availableDepartments = role === 'admin'
    ? departments
    : departments.filter((department) => department.id === currentMembership?.primaryDepartmentId)
  const availableInviteTeams = teams.filter((team) =>
    team.departmentId === inviteDepartmentId
    && (role !== 'leader' || team.id === currentMembership?.primaryTeamId),
  )
  const availableEditTeams = teams.filter((team) => team.departmentId === editDepartmentId)
  const getDepartmentName = (id: string | null) => departments.find((department) => department.id === id)?.name ?? 'Sem setor'
  const getTeamName = (id: string | null) => teams.find((team) => team.id === id)?.name ?? 'Sem equipe'
  const canManageMember = (membership: NonNullable<typeof members>[number]) => {
    if (isAdmin) return true
    if (role === 'manager') {
      return membership.primaryDepartmentId === currentMembership?.primaryDepartmentId
        && membership.role !== 'admin'
        && membership.role !== 'manager'
    }
    return role === 'leader'
      && membership.role === 'employee'
      && membership.primaryTeamId === currentMembership?.primaryTeamId
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
    if (inviteRole !== 'admin' && !inviteDepartmentId) {
      toast.error('Selecione o setor do membro')
      return
    }
    if (inviteRole === 'leader' && !inviteTeamId) {
      toast.error('Selecione a equipe que será liderada')
      return
    }
    try {
      await inviteMember.mutateAsync({
        orgId: orgId as UUID,
        data: {
          email: inviteEmail.trim(),
          role: inviteRole,
          departmentIds: inviteRole === 'admin' ? undefined : [inviteDepartmentId as UUID],
          teamIds: inviteTeamId ? [inviteTeamId as UUID] : undefined,
        },
      })
      toast.success('Pré-cadastro criado. Nenhum e-mail foi enviado; o acesso será ativado no próximo login com este endereço.')
      setInviteEmail('')
      setInviteDepartmentId('')
      setInviteTeamId('')
      setIsDialogOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao adicionar membro')
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
    setInviteTeamId(invitation.primaryTeamId ?? '')
    setIsDialogOpen(true)
  }

  const handleUpdateSettings = async (membershipId: string) => {
    if (isAdmin && editRole !== 'admin' && !editDepartmentId) {
      toast.error('Selecione o setor do membro')
      return
    }
    if (isAdmin && editRole === 'leader' && !editTeamId) {
      toast.error('Selecione a equipe que será liderada')
      return
    }
    try {
      await updateSettings.mutateAsync({ orgId: orgId as UUID, membershipId: membershipId as UUID, data: { maxDailyWorkMinutes: editDailyMinutes } })
      const current = members?.find((membership) => membership.id === membershipId)
      const structureChanged = current && (
        current.role !== editRole
        || (editRole !== 'admin' && current.primaryDepartmentId !== editDepartmentId)
        || ((editRole === 'leader' || editRole === 'employee') && current.primaryTeamId !== (editTeamId || null))
      )
      if (isAdmin && structureChanged) {
        await changeRole.mutateAsync({
          orgId: orgId as UUID,
          membershipId: membershipId as UUID,
          data: {
            role: editRole,
            departmentId: editRole === 'admin' ? undefined : editDepartmentId as UUID,
            teamId: editTeamId ? editTeamId as UUID : undefined,
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
                  setInviteTeamId('')
                }}
                    options={[
                      { value: 'admin', label: 'Administrador' },
                      { value: 'manager', label: 'Chefe de setor' },
                      { value: 'leader', label: 'Líder de equipe' },
                      { value: 'employee', label: 'Colaborador' },
                    ].filter((o) => canInviteRole(role, o.value as Role))}
                  />
                  {inviteRole !== 'admin' && (
                    <Select
                      label="Setor"
                      value={inviteDepartmentId}
                      onChange={(e) => {
                        setInviteDepartmentId(e.target.value)
                        setInviteTeamId('')
                      }}
                      placeholder="Selecione o setor"
                      options={availableDepartments.map((department) => ({ value: department.id, label: department.name }))}
                    />
                  )}
                  {(inviteRole === 'leader' || inviteRole === 'employee') && (
                    <Select
                      label={inviteRole === 'leader' ? 'Equipe liderada' : 'Equipe (opcional)'}
                      value={inviteTeamId}
                      onChange={(e) => setInviteTeamId(e.target.value)}
                      placeholder={inviteRole === 'leader' ? 'Selecione a equipe' : 'Sem equipe'}
                      options={availableInviteTeams.map((team) => ({ value: team.id, label: team.name }))}
                    />
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
        {['all', 'admin', 'manager', 'leader', 'employee'].map((r) => (
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
            { key: 'primaryTeamId', header: 'Equipe', render: (row: any) => getTeamName(row.primaryTeamId) },
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
            setEditTeamId(row.primaryTeamId ?? '')
          }}
          emptyTitle="Nenhum membro corresponde aos filtros."
        />
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
                  setEditTeamId('')
                }}
                options={[
                  { value: 'admin', label: 'Administrador' },
                  { value: 'manager', label: 'Chefe de setor' },
                  { value: 'leader', label: 'Líder de equipe' },
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
                  setEditTeamId('')
                }}
                placeholder="Selecione o setor"
                options={departments.map((department) => ({ value: department.id, label: department.name }))}
              />
            )}
            {isAdmin && (editRole === 'leader' || editRole === 'employee') && (
              <Select
                label={editRole === 'leader' ? 'Equipe liderada' : 'Equipe (opcional)'}
                value={editTeamId}
                onChange={(e) => setEditTeamId(e.target.value)}
                placeholder={editRole === 'leader' ? 'Selecione a equipe' : 'Sem equipe'}
                options={availableEditTeams.map((team) => ({ value: team.id, label: team.name }))}
              />
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
