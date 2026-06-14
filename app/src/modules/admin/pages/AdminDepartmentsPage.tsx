import { useState } from 'react'
import { motion } from 'motion/react'
import { Building2, Plus, Trash2, Users, Users2, FolderKanban, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { useDepartments, useCreateDepartment } from '@/core/api/hooks'
import { useTeams } from '@/core/api/hooks'
import { useMemberships } from '@/core/api/hooks'
import { canManageOrganization } from '@/core/auth/permissions'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { StatCard } from '@/shared/components/charts/StatCard'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
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
import type { UUID } from '@/core/api/types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function AdminDepartmentsPage() {
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { data: departments, isLoading: deptLoading, error: deptError } = useDepartments(orgId as UUID)
  const { data: memberships } = useMemberships(orgId as UUID)
  const createDept = useCreateDepartment()

  const [newName, setNewName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const canCreate = canManageOrganization(role)

  const handleCreate = async () => {
    if (!newName.trim() || !orgId) return
    try {
      await createDept.mutateAsync({ orgId: orgId as UUID, data: { name: newName.trim() } })
      toast.success('Department created')
      setNewName('')
      setIsDialogOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create department')
    }
  }

  const memberCount = (deptId: string) =>
    memberships?.filter((m) => m.id.startsWith(deptId.slice(0, 5))).length ?? 0

  if (deptLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
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
        <PageHeader title="Departments" description="Manage organization departments" />
        <EmptyState icon={Building2} title="Failed to load departments" description={deptError.message} />
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader title="Departments" description="Manage organization departments">
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                New Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Department</DialogTitle>
                <DialogDescription>Add a new department to the organization.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Department name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!newName.trim() || createDept.isPending}>
                  {createDept.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={containerVariants}>
        <motion.div variants={itemVariants}>
          <StatCard value={departments?.length ?? 0} label="Departments" icon={Building2} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={memberships?.length ?? 0} label="Members" icon={Users} />
        </motion.div>
      </motion.div>

      {departments?.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          description="Create your first department to organize your teams."
          actionLabel="New Department"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <motion.div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" variants={containerVariants}>
          {departments?.map((dept) => (
            <motion.div key={dept.id} variants={itemVariants} layout>
              <Card className="group relative overflow-hidden transition-all hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{dept.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Created {formatDate(dept.createdAt)}</p>
                    </div>
                    {canCreate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={() => setDeleteTarget(dept.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FolderKanban className="size-3.5" />
                      Projects
                    </span>
                    <span className="flex items-center gap-1">
                      <Users2 className="size-3.5" />
                      {memberCount(dept.id)} members
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <Alert variant="destructive">
          <AlertTitle>Delete Department?</AlertTitle>
          <AlertDescription>This action cannot be undone.</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => setDeleteTarget(null)}>
            Delete
          </Button>
        </div>
      </Modal>
    </motion.div>
  )
}
