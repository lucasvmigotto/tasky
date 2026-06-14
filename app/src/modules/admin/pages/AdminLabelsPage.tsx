import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Tags, Plus, Trash2, Shield, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { useLabels, useCreateLabel, useDeleteLabel } from '@/core/api/hooks'
import { canManageLabels } from '@/core/auth/permissions'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Badge } from '@/shared/components/ui/Badge'
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

export default function AdminLabelsPage() {
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { data: labels, isLoading, error } = useLabels(orgId as UUID)
  const createLabel = useCreateLabel()
  const deleteLabel = useDeleteLabel()

  const [activeTab, setActiveTab] = useState<'all' | 'system' | 'custom'>('all')
  const [newSlug, setNewSlug] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const canCreate = canManageLabels(role)

  const filtered = useMemo(() => {
    if (!labels) return []
    if (activeTab === 'system') return labels.filter((l) => l.isSystem)
    if (activeTab === 'custom') return labels.filter((l) => !l.isSystem)
    return labels
  }, [labels, activeTab])

  const handleCreate = async () => {
    if (!newSlug.trim() || !newDisplayName.trim() || !orgId) return
    try {
      await createLabel.mutateAsync({ orgId: orgId as UUID, data: { slug: newSlug.trim().toLowerCase().replace(/\s+/g, '-'), displayName: newDisplayName.trim() } })
      toast.success('Label created')
      setNewSlug('')
      setNewDisplayName('')
      setIsDialogOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create label')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !orgId) return
    try {
      await deleteLabel.mutateAsync({ orgId: orgId as UUID, labelId: deleteTarget as UUID })
      toast.success('Label deleted')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete label')
    }
    setDeleteTarget(null)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Labels" description="Manage activity labels" />
        <EmptyState icon={Tags} title="Failed to load labels" description={error.message} />
      </div>
    )
  }

  const labelsCounts = {
    all: labels?.length ?? 0,
    system: labels?.filter((l) => l.isSystem).length ?? 0,
    custom: labels?.filter((l) => !l.isSystem).length ?? 0,
  }

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader title="Labels" description="Manage activity labels">
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                New Label
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Label</DialogTitle>
                <DialogDescription>Add a custom label for activities.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <Input
                  placeholder="Slug (e.g. bug, research)"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                />
                <Input
                  placeholder="Display name (e.g. Bug, Research)"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newSlug.trim() || !newDisplayName.trim() || createLabel.isPending}>
                  {createLabel.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {(['all', 'system', 'custom'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">({labelsCounts[tab]})</span>
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Tags} title="No labels found" description="Create custom labels to organize your activities." />
      ) : (
        <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" variants={containerVariants}>
          {filtered.map((label) => (
            <motion.div key={label.id} variants={itemVariants} layout>
              <div className="group relative rounded-lg border bg-card p-5 transition-all hover:border-primary/30">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{label.displayName}</h3>
                      {label.isSystem && (
                        <Badge variant="secondary">
                          <Shield className="mr-1 size-3" />
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">/{label.slug}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Created {formatDate(label.createdAt)}</p>
                  </div>
                  {!label.isSystem && canCreate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={() => setDeleteTarget(label.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <h3 className="mb-2 font-semibold">Delete Label?</h3>
        <p className="text-sm text-muted-foreground">This label will be removed from all activities. This action cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </motion.div>
  )
}
