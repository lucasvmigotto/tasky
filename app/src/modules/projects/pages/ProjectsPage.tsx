import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { FolderKanban, ArrowUpRight, Clock, Loader2 } from 'lucide-react'
import { ROUTES, buildRoute } from '@/core/config/routes'
import { useAuthStore } from '@/core/auth/authStore'
import { useProjects, useDepartments } from '@/core/api/hooks'
import { canCreateProject, canManageOrganization } from '@/core/auth/permissions'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Input } from '@/shared/components/ui/Input'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
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
import { Select } from '@/shared/components/ui/Select'
import { formatDate } from '@/shared/lib/formatters'
import { toast } from 'sonner'
import type { UUID } from '@/core/api/types'

const DEPT_GRADIENTS: Record<string, string> = {
  violet: 'from-emerald-500/10 to-emerald-600/5',
  sky: 'from-violet-500/10 to-violet-600/5',
  amber: 'from-amber-500/10 to-amber-600/5',
}

const DEPT_ICON_COLORS: Record<string, string> = {
  violet: 'bg-emerald-500/10 text-emerald-400',
  sky: 'bg-violet-500/10 text-violet-400',
  amber: 'bg-amber-500/10 text-amber-400',
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { data: projects, isLoading, error } = useProjects(orgId as UUID)
  const { data: departments } = useDepartments(orgId as UUID)
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const canCreate = canCreateProject(role) || canManageOrganization(role)

  const filtered = useMemo(() => {
    if (!projects) return []
    if (!search) return projects
    const q = search.toLowerCase()
    return projects.filter((p) => p.name.toLowerCase().includes(q))
  }, [projects, search])

  const getDeptName = (deptId: string) => departments?.find((d) => d.id === deptId)?.name ?? 'Unknown'

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Projects" description="View and manage projects" />
        <EmptyState icon={FolderKanban} title="Failed to load projects" description={error.message} />
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader title="Projects" description="View and manage your projects">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
      </PageHeader>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={search ? 'No projects match your search' : 'No projects yet'}
          description={search ? 'Try a different search term.' : 'Projects help you organize activities and track time.'}
        />
      ) : (
        <motion.div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" variants={containerVariants}>
          {filtered.map((project, i) => {
            const gradientKey = ['violet', 'sky', 'amber'][i % 3]
            return (
              <motion.div key={project.id} variants={itemVariants} layout>
                <Card
                  className="group cursor-pointer overflow-hidden transition-all hover:border-primary/30"
                  onClick={() => navigate(buildRoute(ROUTES.PROJECT_DETAIL, { projectId: project.id }))}
                >
                  <div className={`h-1.5 bg-gradient-to-r ${DEPT_GRADIENTS[gradientKey]}`} />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{project.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{getDeptName(project.departmentId)}</p>
                      </div>
                      <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    {project.description && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {formatDate(project.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
