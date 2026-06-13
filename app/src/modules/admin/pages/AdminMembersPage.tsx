import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import {
  Plus,
  Search,
  Mail,
  Trash2,
  Edit3,
  MoreHorizontal,
  Settings,
} from 'lucide-react'
import type { Role } from '@/core/auth/permissions'
import { canInviteMembers, canManageOrganization } from '@/core/auth/permissions'
import { useAuthStore } from '@/core/auth/authStore'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Badge } from '@/shared/components/ui/Badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/components/ui/Avatar'
import { DataTable, type DataTableColumn } from '@/shared/components/ui/DataTable'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/Dialog'
import { Select, type SelectOption } from '@/shared/components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/Tabs'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/components/ui/DropdownMenu'
import { Modal } from '@/shared/components/ui/Modal'
import { formatDate } from '@/shared/lib/formatters'
import { demoMembers } from '@/modules/admin/data/members.mock'
import { demoDepartments } from '@/modules/admin/data/departments.mock'
import { demoTeams } from '@/modules/admin/data/teams.mock'

const ROLES: { value: Role; label: string; color: string }[] = [
  { value: 'admin', label: 'Admin', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  { value: 'manager', label: 'Gerente', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  { value: 'leader', label: 'Líder', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  { value: 'employee', label: 'Funcionário', color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20' },
]

const roleSelectOptions: SelectOption[] = ROLES.map((r) => ({ value: r.value, label: r.label }))

const memberDepartmentMap: Record<string, string> = {
  'memb-001': 'dept-001',
  'memb-002': 'dept-001',
  'memb-003': 'dept-002',
  'memb-004': 'dept-002',
  'memb-005': 'dept-001',
  'memb-006': 'dept-003',
  'memb-007': 'dept-003',
  'memb-008': 'dept-002',
}

const memberTeamMap: Record<string, string[]> = {
  'memb-001': ['team-001', 'team-002'],
  'memb-002': ['team-002', 'team-003'],
  'memb-003': ['team-004'],
  'memb-004': ['team-004', 'team-005'],
  'memb-005': ['team-001'],
  'memb-006': ['team-006'],
  'memb-007': ['team-006'],
  'memb-008': ['team-005'],
}

const avatarColors = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-green-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-pink-500',
]

function getInitials(name: string) {
  return name
    .split(/[.\s_]/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function AdminMembersPage() {
  const role = useAuthStore((s) => s.activeOrg?.role)
  const isAdmin = role ? canManageOrganization(role) : false
  const canInvite = role ? canInviteMembers(role) : false

  const [search, setSearch] = useState('')
  const [roleTab, setRoleTab] = useState('all')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('employee')
  const [inviteDept, setInviteDept] = useState('')
  const [inviteTeam, setInviteTeam] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editMember, setEditMember] = useState<(typeof demoMembers)[number] | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editMaxMinutes, setEditMaxMinutes] = useState('480')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<(typeof demoMembers)[number] | null>(null)

  const getDeptName = (id: string) => demoDepartments.find((d) => d.id === id)?.name ?? '-'
  const getTeamNames = (ids: string[]) =>
    ids.map((id) => demoTeams.find((t) => t.id === id)?.name).filter(Boolean).join(', ') || '-'

  const availableTeams = useMemo(() => {
    if (!inviteDept) return demoTeams
    return demoTeams.filter((t) => t.departmentId === inviteDept)
  }, [inviteDept])

  const filteredMembers = useMemo(() => {
    let list = demoMembers
    if (roleTab !== 'all') {
      list = list.filter((m) => m.role === roleTab)
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.username.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q),
      )
    }
    return list
  }, [roleTab, search])

  function handleInvite() {
    setInviteEmail('')
    setInviteRole('employee')
    setInviteDept('')
    setInviteTeam('')
    setInviteOpen(false)
  }

  function handleEdit() {
    if (!editMember) return
    setEditOpen(false)
    setEditMember(null)
  }

  function openEdit(member: (typeof demoMembers)[number]) {
    setEditMember(member)
    setEditUsername(member.customUsername ?? member.username)
    setEditMaxMinutes(String(member.maxDailyWorkMinutes))
    setEditOpen(true)
  }

  function handleDelete() {
    setDeleteOpen(false)
    setDeleteTarget(null)
  }

  const columns: DataTableColumn<(typeof demoMembers)[number]>[] = [
    {
      key: 'name',
      header: 'Membro',
      render: (row) => {
        const avatarIdx = parseInt(row.id.slice(-1), 10) % avatarColors.length
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback className={`${avatarColors[avatarIdx]} text-white text-xs`}>
                {getInitials(row.username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{row.username}</p>
              <p className="text-xs text-muted-foreground">{row.email}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'role',
      header: 'Função',
      render: (row) => {
        const roleCfg = ROLES.find((r) => r.value === row.role)
        return (
          <Badge
            variant="outline"
            className={roleCfg?.color ?? ''}
          >
            {roleCfg?.label ?? row.role}
          </Badge>
        )
      },
    },
    {
      key: 'department',
      header: 'Departamento',
      render: (row) => <span className="text-foreground">{getDeptName(memberDepartmentMap[row.id] ?? '')}</span>,
    },
    {
      key: 'teams',
      header: 'Times',
      render: (row) => (
        <span className="text-xs text-muted-foreground max-w-[180px] truncate inline-block">
          {getTeamNames(memberTeamMap[row.id] ?? [])}
        </span>
      ),
    },
    {
      key: 'maxDailyWorkMinutes',
      header: 'Horas/Dia',
      render: (row) => <span className="text-foreground">{(row.maxDailyWorkMinutes / 60).toFixed(1)}h</span>,
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      render: (row) => (
        <span className="text-muted-foreground text-xs">{formatDate(row.createdAt)}</span>
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
            <DropdownMenuItem onClick={() => openEdit(row)}>
              <Edit3 className="size-3.5" />
              Editar
            </DropdownMenuItem>
            {isAdmin && (
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
      <PageHeader title="Membros" description="Gerenciar membros da organização">
        {canInvite && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger>
              <Button>
                <Plus className="size-4" />
                Convidar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Membro</DialogTitle>
                <DialogDescription>
                  Envie um convite para um novo membro da organização.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <Select
                  label="Função"
                  options={roleSelectOptions}
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                />
                <Select
                  label="Departamento (opcional)"
                  options={[
                    { value: '', label: 'Nenhum' },
                    ...demoDepartments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                  value={inviteDept}
                  onChange={(e) => {
                    setInviteDept(e.target.value)
                    setInviteTeam('')
                  }}
                />
                {inviteDept && (
                  <Select
                    label="Time (opcional)"
                    options={[
                      { value: '', label: 'Nenhum' },
                      ...availableTeams.map((t) => ({ value: t.id, label: t.name })),
                    ]}
                    value={inviteTeam}
                    onChange={(e) => setInviteTeam(e.target.value)}
                  />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleInvite} disabled={!inviteEmail}>
                  <Mail className="size-4" />
                  Convidar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={roleTab} onValueChange={setRoleTab} defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            {ROLES.map((r) => (
              <TabsTrigger key={r.value} value={r.value}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar membros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filteredMembers}
        keyExtractor={(row) => row.id}
        emptyTitle="Nenhum membro encontrado"
        emptyDescription="Tente ajustar sua busca ou filtros."
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
            <DialogDescription>
              Altere as configurações do membro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              label="Nome de usuário"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
            />
            <Input
              label="Minutos máximos por dia"
              type="number"
              min={60}
              max={1440}
              value={editMaxMinutes}
              onChange={(e) => setEditMaxMinutes(e.target.value)}
              helperText="Quantidade máxima de minutos de trabalho por dia (480 = 8h)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>
              <Settings className="size-4" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remover Membro"
        description={`Tem certeza que deseja remover "${deleteTarget?.username ?? ''}" da organização? Esta ação não pode ser desfeita.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="size-4" />
            Remover
          </Button>
        </div>
      </Modal>
    </div>
  )
}
