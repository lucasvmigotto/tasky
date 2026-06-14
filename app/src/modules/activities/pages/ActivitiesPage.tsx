import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, List, Columns3, Clock, User, Loader2 } from 'lucide-react'
import { ROUTES, buildRoute } from '@/core/config/routes'
import { useAuthStore } from '@/core/auth/authStore'
import { useActivities, useProjects, useMemberships, useLabels, useCreateActivity } from '@/core/api/hooks'
import type { ActivityResponse, FibonacciWeight, UUID } from '@/core/api/types'
import { isValidFibonacciWeight, FIBONACCI_WEIGHTS } from '@/core/api/types'
import { canCreateActivityFor } from '@/core/auth/permissions'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { Textarea } from '@/shared/components/ui/Textarea'
import { DataTable } from '@/shared/components/ui/DataTable'
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
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { formatDateTime } from '@/shared/lib/formatters'
import { toast } from 'sonner'

const WEIGHT_VALUES: FibonacciWeight[] = [1, 2, 3, 5, 8, 13]

const weightConfig: Record<number, { label: string; badge: string }> = {
  1: { label: '1', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  2: { label: '2', badge: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  3: { label: '3', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  5: { label: '5', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  8: { label: '8', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  13: { label: '13', badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

type ViewMode = 'list' | 'kanban'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.08 } },
}

export default function ActivitiesPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [projectFilter, setProjectFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: projects } = useProjects(orgId as UUID)
  const { data: members } = useMemberships(orgId as UUID)
  const { data: labels } = useLabels(orgId as UUID)
  const createActivity = useCreateActivity()

  const [selectedProject, setSelectedProject] = useState(projects?.[0]?.id ?? '')
  const { data: activities, isLoading, error } = useActivities(selectedProject as UUID)

  const filtered = useMemo(() => {
    if (!activities) return []
    let list = activities
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((a) => a.title.toLowerCase().includes(q))
    }
    return list
  }, [activities, search])

  const getLabelName = (id: string) => labels?.find((l) => l.id === id)?.displayName ?? id
  const getMemberName = (id: string) => members?.find((m) => m.id === id)?.username ?? id
  const getProjectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? id

  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newWeight, setNewWeight] = useState<FibonacciWeight>(1)
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [newLabels, setNewLabels] = useState<string[]>([])

  const handleCreate = async () => {
    if (!newTitle.trim() || !newStart || !newEnd || !newAssignee || !selectedProject) return
    if (new Date(newStart) >= new Date(newEnd)) {
      toast.error('Start datetime must be before end datetime')
      return
    }
    try {
      await createActivity.mutateAsync({
        projectId: selectedProject as UUID,
        data: {
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          weight: newWeight,
          startDatetime: new Date(newStart).toISOString(),
          endDatetime: new Date(newEnd).toISOString(),
          assignedToMembershipId: newAssignee as UUID,
          labelIds: newLabels.length > 0 ? newLabels as UUID[] : undefined,
        },
      })
      toast.success('Activity created')
      setNewTitle('')
      setNewDesc('')
      setNewWeight(1)
      setNewStart('')
      setNewEnd('')
      setNewAssignee('')
      setNewLabels([])
      setIsDialogOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create activity')
    }
  }

  const isSelf = (membershipId: string) => {
    const m = members?.find((m) => m.id === membershipId)
    return m?.userId === user?.id
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
        <PageHeader title="Activities" description="View and manage activities" />
        <EmptyState icon={Clock} title="Failed to load activities" description={error.message} />
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader title="Activities" description="Track your work activities">
        <div className="flex items-center gap-2">
          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            placeholder="All projects"
            options={[
              { value: 'all', label: 'All Projects' },
              ...(projects?.map((p) => ({ value: p.id, label: p.name })) ?? []),
            ]}
          />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40"
          />
          <div className="flex rounded-lg border bg-card p-0.5">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-8"
              onClick={() => setViewMode('list')}
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-8"
              onClick={() => setViewMode('kanban')}
            >
              <Columns3 className="size-4" />
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                New Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Activity</DialogTitle>
                <DialogDescription>Create a new time activity.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <Select
                  label="Project"
                  value={selectedProject}
                  onChange={(e) => { setSelectedProject(e.target.value); setNewAssignee('') }}
                  options={projects?.map((p) => ({ value: p.id, label: p.name })) ?? []}
                />
                <Input label="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="What are you working on?" />
                <Textarea label="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional details..." />
                <Select
                  label="Weight"
                  value={newWeight.toString()}
                  onChange={(e) => setNewWeight(Number(e.target.value) as FibonacciWeight)}
                  options={WEIGHT_VALUES.map((w) => ({ value: w.toString(), label: `Level ${w}` }))}
                />
                <Input label="Start" type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                <Input label="End" type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                <Select
                  label="Assignee"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  placeholder="Select assignee"
                  options={
                    members
                      ?.filter((m) => isSelf(m.id) || canCreateActivityFor(role, m.role))
                      .map((m) => ({ value: m.id, label: `${m.username} (${m.role})` })) ?? []
                  }
                />
                <Select
                  label="Labels"
                  value={newLabels[0] ?? ''}
                  onChange={(e) => setNewLabels(e.target.value ? [e.target.value] : [])}
                  placeholder="Select label"
                  options={labels?.map((l) => ({ value: l.id, label: l.displayName })) ?? []}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newTitle.trim() || !newStart || !newEnd || !newAssignee || createActivity.isPending}>
                  {createActivity.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {filtered.length === 0 ? (
        <EmptyState icon={Clock} title="No activities found" description="Create your first activity to start tracking time." actionLabel="New Activity" onAction={() => setIsDialogOpen(true)} />
      ) : (
        <DataTable
          columns={[
            { key: 'title', header: 'Title', render: (row: any) => (
              <div>
                <button className="font-medium hover:text-primary" onClick={() => navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: row.id }))}>{row.title}</button>
                <div className="text-xs text-muted-foreground">{getProjectName(row.projectId)}</div>
              </div>
            )},
            { key: 'weight', header: 'W', render: (row: any) => (
              <span className={`inline-flex size-7 items-center justify-center rounded-md border text-xs font-medium ${weightConfig[row.weight as number]?.badge}`}>{row.weight}</span>
            )},
            { key: 'assignedTo', header: 'Assignee', render: (row: any) => (
              <span className="flex items-center gap-1 text-sm"><User className="size-3.5 text-muted-foreground" />{getMemberName(row.assignedTo)}</span>
            )},
            { key: 'startDatetime', header: 'Start', render: (row: any) => formatDateTime(row.startDatetime) },
            { key: 'endDatetime', header: 'End', render: (row: any) => formatDateTime(row.endDatetime) },
            { key: 'labelIds', header: 'Labels', render: (row: any) => (
              <div className="flex gap-1">
                {(row.labelIds as string[]).slice(0, 2).map((id: string) => (
                  <Badge key={id} variant="secondary">{getLabelName(id)}</Badge>
                ))}
              </div>
            )},
          ]}
          rows={filtered}
          keyExtractor={(row: any) => row.id}
          onRowClick={(row: any) => navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: row.id }))}
          emptyTitle="No activities yet."
        />
      )}
    </motion.div>
  )
}
