import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Clock, User, Tag, FolderKanban, Trash2, Link2, Loader2 } from 'lucide-react'
import { ROUTES, buildRoute } from '@/core/config/routes'
import { useAuthStore } from '@/core/auth/authStore'
import { canEditActivity } from '@/core/auth/permissions'
import { useActivity, useActivities, useProjects, useMemberships, useLabels, useDeleteActivity, useAddDependency, useRemoveDependency } from '@/core/api/hooks'
import { DependencyTree } from '@/shared/components/activities/DependencyTree'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Select } from '@/shared/components/ui/Select'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Avatar, AvatarFallback } from '@/shared/components/ui/Avatar'
import { Separator } from '@/shared/components/ui/Separator'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { formatDateTime } from '@/shared/lib/formatters'
import { toast } from 'sonner'
import type { UUID } from '@/core/api/types'

const weightConfig: Record<number, { label: string; badge: string }> = {
  1: { label: '1', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  2: { label: '2', badge: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  3: { label: '3', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  5: { label: '5', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  8: { label: '8', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  13: { label: '13', badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function ActivityDetailPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { data: activity, isLoading, error } = useActivity(activityId as UUID)
  const { data: allActivities } = useActivities(activity?.projectId as UUID)
  const { data: projects } = useProjects(orgId as UUID)
  const { data: members } = useMemberships(orgId as UUID)
  const { data: labels } = useLabels(orgId as UUID)
  const deleteActivity = useDeleteActivity()
  const addDependency = useAddDependency()
  const removeDependency = useRemoveDependency()

  const [depParentId, setDepParentId] = useState('')
  const [showAddDep, setShowAddDep] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const canDelete = canEditActivity(role)

  const handleDelete = async () => {
    if (!activityId) return
    try {
      await deleteActivity.mutateAsync(activityId as UUID)
      toast.success('Activity deleted')
      navigate(ROUTES.ACTIVITIES)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete activity')
    }
  }

  const handleAddDependency = async () => {
    if (!activityId || !depParentId) return
    try {
      await addDependency.mutateAsync({ childId: activityId as UUID, parentId: depParentId as UUID })
      toast.success('Dependency added')
      setDepParentId('')
      setShowAddDep(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add dependency')
    }
  }

  const handleRemoveDependency = async (parentId: string) => {
    if (!activityId) return
    try {
      await removeDependency.mutateAsync({ childId: activityId as UUID, parentId: parentId as UUID })
      toast.success('Dependency removed')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove dependency')
    }
  }

  const projectName = projects?.find((p) => p.id === activity?.projectId)?.name ?? 'Unknown'
  const memberName = (id: string) => members?.find((m) => m.id === id)?.username ?? id
  const labelName = (id: string) => labels?.find((l) => l.id === id)?.displayName ?? id

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Activity not found" description="The activity could not be loaded." />
        <EmptyState icon={Clock} title="Activity not found" description={error?.message ?? 'This activity does not exist.'} />
      </div>
    )
  }

  const candidateParents = allActivities?.filter((a) => a.id !== activityId) ?? []

  return (
    <motion.div className="flex flex-col gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={activity.title}
        description={`${projectName} — ${formatDateTime(activity.startDatetime)}`}
      >
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1.5 size-4" /> Back
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{activity.description || 'No description provided.'}</p>
            </CardContent>
          </Card>

          {/* Time */}
          <Card>
            <CardHeader><CardTitle>Time</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Start</p>
                  <p className="text-sm font-medium">{formatDateTime(activity.startDatetime)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End</p>
                  <p className="text-sm font-medium">{formatDateTime(activity.endDatetime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dependencies */}
          <DependencyTree
            activity={activity}
            allActivities={allActivities ?? []}
            dependencies={[]}
            onActivityClick={(id) => navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: id }))}
            onAddDependency={() => setShowAddDep(true)}
            onRemoveDependency={handleRemoveDependency}
          />

          {/* Add Dependency Dialog */}
          {showAddDep && (
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 text-sm font-medium">Add parent dependency</p>
                <div className="flex items-center gap-2">
                  <Select
                    value={depParentId}
                    onChange={(e) => setDepParentId(e.target.value)}
                    placeholder="Select activity..."
                    options={candidateParents.map((a) => ({ value: a.id, label: a.title }))}
                  />
                  <Button size="sm" onClick={handleAddDependency} disabled={!depParentId || addDependency.isPending}>
                    {addDependency.isPending ? <Loader2 className="size-3 animate-spin" /> : <Link2 className="size-3" />}
                    Add
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddDep(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FolderKanban className="size-4" /> Project
                </span>
                <span className="text-sm font-medium">{projectName}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="size-4" /> Assignee
                </span>
                <span className="text-sm font-medium">{memberName(activity.assignedTo)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" /> Weight
                </span>
                <span className={`inline-flex size-7 items-center justify-center rounded-md border text-xs font-medium ${weightConfig[activity.weight]?.badge}`}>
                  {activity.weight}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="size-4" /> Labels
                </span>
                <div className="flex flex-wrap gap-1">
                  {activity.labelIds?.length > 0
                    ? activity.labelIds.map((id) => (
                        <Badge key={id} variant="secondary" className="text-[10px]">
                          {labelName(id)}
                        </Badge>
                      ))
                    : <span className="text-xs text-muted-foreground">None</span>
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delete */}
          {canDelete && (
            <Card>
              <CardContent className="p-4">
                {!confirmDelete ? (
                  <Button variant="destructive" className="w-full" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="mr-1.5 size-4" /> Delete Activity
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-destructive">Are you sure?</p>
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" className="flex-1" onClick={handleDelete}>
                        {deleteActivity.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Confirm'}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  )
}
