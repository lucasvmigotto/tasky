import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Users, Plus, UserCog, Shield, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { useMemberships, useInviteMember, useUpdateMembershipSettings } from '@/core/api/hooks'
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
import type { UUID } from '@/core/api/types'

const roleColors: Record<Role, 'default' | 'secondary' | 'info' | 'success'> = {
  admin: 'default',
  manager: 'info',
  leader: 'secondary',
  employee: 'success',
}

export default function AdminMembersPage() {
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { data: members, isLoading, error } = useMemberships(orgId as UUID)
  const inviteMember = useInviteMember()
  const updateSettings = useUpdateMembershipSettings()

  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('employee')
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editDailyMinutes, setEditDailyMinutes] = useState(480)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const canInvite = role === 'admin' || role === 'manager' || role === 'leader'

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
    try {
      await inviteMember.mutateAsync({ orgId: orgId as UUID, data: { email: inviteEmail.trim(), role: inviteRole } })
      toast.success('Invitation sent')
      setInviteEmail('')
      setIsDialogOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to invite user')
    }
  }

  const handleUpdateSettings = async (membershipId: string) => {
    try {
      await updateSettings.mutateAsync({ orgId: orgId as UUID, membershipId: membershipId as UUID, data: { maxDailyWorkMinutes: editDailyMinutes } })
      toast.success('Settings updated')
      setEditingMember(null)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update settings')
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
        <PageHeader title="Members" description="Manage team members" />
        <EmptyState icon={Users} title="Failed to load members" description={error.message} />
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader title="Members" description="Manage organization members">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          {canInvite && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 size-4" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Member</DialogTitle>
                  <DialogDescription>Send an invitation to join the organization.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <Input
                    placeholder="Email address"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
              <Select
                label="Role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                    options={[
                      { value: 'admin', label: 'Admin' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'leader', label: 'Leader' },
                      { value: 'employee', label: 'Employee' },
                    ].filter((o) => canInviteRole(role, o.value as Role))}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviteMember.isPending}>
                    {inviteMember.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Send Invite
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
            {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
            {r !== 'all' && ` (${members?.filter((m) => m.role === r).length ?? 0})`}
          </Button>
        ))}
      </div>

      {members?.length === 0 ? (
        <EmptyState icon={Users} title="No members yet" description="Invite members to get started." />
      ) : (
        <DataTable
          columns={[
            { key: 'username', header: 'User', render: (row: any) => (
              <div>
                <div className="font-medium">{row.username}</div>
                <div className="text-xs text-muted-foreground">{row.email}</div>
              </div>
            )},
            { key: 'role', header: 'Role', render: (row: any) => <Badge variant={roleColors[row.role as Role]}>{row.role}</Badge> },
            { key: 'maxDailyWorkMinutes', header: 'Max/Day', render: (row: any) => `${row.maxDailyWorkMinutes} min` },
            { key: 'createdAt', header: 'Since', render: (row: any) => formatDate(row.createdAt) },
          ]}
          rows={filtered}
          keyExtractor={(row: any) => row.id}
          onRowClick={(row: any) => {
            setEditingMember(row.id)
            setEditDailyMinutes(row.maxDailyWorkMinutes)
          }}
          emptyTitle="No members match your filters."
        />
      )}

      <Dialog open={!!editingMember} onOpenChange={(o) => !o && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Member Settings</DialogTitle>
            <DialogDescription>Update member configuration.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input
              label="Max daily work minutes"
              type="number"
              min={1}
              max={1440}
              value={editDailyMinutes}
              onChange={(e) => setEditDailyMinutes(Number(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
            <Button onClick={() => editingMember && handleUpdateSettings(editingMember)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
