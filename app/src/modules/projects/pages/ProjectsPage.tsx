import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { FolderKanban, Users, ArrowUpRight, Calendar, Timer, Clock } from 'lucide-react'
import { ROUTES, buildRoute } from '@/core/config/routes'
import { Badge } from '@/shared/components/ui/Badge'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Input } from '@/shared/components/ui/Input'
import { Separator } from '@/shared/components/ui/Separator'
import { Progress } from '@/shared/components/ui/Progress'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/shared/lib/cn'
import { formatDate } from '@/shared/lib/formatters'
import { demoProjects } from '@/modules/projects/data/projects.mock'
import { demoMembers } from '@/modules/admin/data/members.mock'
import { demoDepartments } from '@/modules/admin/data/departments.mock'
import { demoActivities } from '@/modules/activities/data/activities.mock'
import { demoProjectAssignments } from '@/modules/projects/data/projects.mock'
import { demoTimeEntries } from '@/modules/time-tracker/data/entries.mock'

const DEPT_GRADIENTS: Record<string, string> = {
  'dept-001': 'from-emerald-500/10 to-emerald-600/5',
  'dept-002': 'from-violet-500/10 to-violet-600/5',
  'dept-003': 'from-amber-500/10 to-amber-600/5',
}

const DEPT_ICON_COLORS: Record<string, string> = {
  'dept-001': 'bg-emerald-500/10 text-emerald-400',
  'dept-002': 'bg-violet-500/10 text-violet-400',
  'dept-003': 'bg-amber-500/10 text-amber-400',
}

function getDepartmentName(departmentId: string): string {
  return demoDepartments.find((d) => d.id === departmentId)?.name ?? 'Desconhecido'
}

function getManagerName(membershipId: string): string {
  return demoMembers.find((m) => m.id === membershipId)?.username ?? 'Desconhecido'
}

function getActivityCount(projectId: string): number {
  return demoActivities.filter((a) => a.projectId === projectId).length
}

function getMemberCount(projectId: string): number {
  const assignment = demoProjectAssignments.find((pa) => pa.projectId === projectId)
  return assignment?.membershipIds.length ?? 0
}

function getLastActivityDate(projectId: string): string | null {
  const projectActivities = demoActivities.filter((a) => a.projectId === projectId)
  if (projectActivities.length === 0) return null
  return projectActivities.sort(
    (a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime(),
  )[0].startDatetime
}

function getEstimatedHours(projectId: string): number {
  const projectActivities = demoActivities.filter((a) => a.projectId === projectId)
  return projectActivities.reduce((sum, a) => sum + a.weight * 4, 0)
}

function getLoggedHours(projectId: string): number {
  const seconds = demoTimeEntries
    .filter((entry) => entry.projectId === projectId)
    .reduce((sum, entry) => sum + entry.duration, 0)
  return Math.round((seconds / 3600) * 10) / 10
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const departments = useMemo(() => {
    const deptIds = [...new Set(demoProjects.map((p) => p.departmentId))]
    return deptIds
      .map((id) => demoDepartments.find((d) => d.id === id))
      .filter(Boolean) as typeof demoDepartments
  }, [])

  const filteredProjects = useMemo(() => {
    return demoProjects.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (filterDept && p.departmentId !== filterDept) return false
      if (!showInactive && !p.isActive) return false
      return true
    })
  }, [search, filterDept, showInactive])

  const summary = useMemo(() => {
    const totalHours = demoProjects.reduce((sum, project) => sum + getLoggedHours(project.id), 0)
    const activeProjects = demoProjects.filter((project) => project.isActive).length
    return {
      totalProjects: demoProjects.length,
      activeProjects,
      totalActivities: demoActivities.length,
      totalHours,
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projetos"
        description="Acompanhe horas, atividades e progresso dos projetos fora da área administrativa"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Projetos</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary.totalProjects}</p>
            <p className="mt-1 text-xs text-emerald-400">{summary.activeProjects} ativos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Horas registradas</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary.totalHours.toFixed(1)}h</p>
            <p className="mt-1 text-xs text-muted-foreground">vindas do Registro de Tempo</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500/10 to-transparent">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Atividades</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary.totalActivities}</p>
            <p className="mt-1 text-xs text-muted-foreground">planejadas nos projetos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Departamentos</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{departments.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">com projetos vinculados</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <Input
          placeholder="Buscar projetos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-[240px] text-sm"
        />
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
          <button
            onClick={() => setFilterDept('')}
            className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
              filterDept === ''
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setFilterDept(dept.id)}
              className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                filterDept === dept.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-border" />
        <button
          onClick={() => setShowInactive((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            showInactive
              ? 'bg-warning/10 text-warning'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          {showInactive ? 'Mostrando inativos' : 'Ocultar inativos'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project, index) => {
          const activityCount = getActivityCount(project.id)
          const memberCount = getMemberCount(project.id)
          const lastActivity = getLastActivityDate(project.id)
          const estimatedHours = getEstimatedHours(project.id)
          const loggedHours = getLoggedHours(project.id)
          const hoursProgress = estimatedHours > 0 ? Math.min((loggedHours / estimatedHours) * 100, 100) : 0
          const gradient = DEPT_GRADIENTS[project.departmentId] ?? 'from-muted/30 to-muted/10'
          const iconColor = DEPT_ICON_COLORS[project.departmentId] ?? 'bg-primary/10 text-primary'

          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
            >
              <Card
                className="group cursor-pointer overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg"
                onClick={() =>
                  navigate(buildRoute(ROUTES.PROJECT_DETAIL, { projectId: project.id }))
                }
              >
                <div className={cn('bg-gradient-to-br p-5', gradient)}>
                  <div className="mb-4 flex items-start justify-between">
                    <div className={cn('flex size-12 items-center justify-center rounded-xl shadow-sm', iconColor)}>
                      <FolderKanban className="size-6" />
                    </div>
                    <Badge
                      variant={project.isActive ? 'success' : 'secondary'}
                      className="text-[10px] px-2 py-0.5 leading-none shadow-sm"
                    >
                      {project.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  <h3 className="mb-1 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="mb-4 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>

                <CardContent className="p-5 pt-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
                      <FolderKanban className="size-3" />
                      {getDepartmentName(project.departmentId)}
                    </span>
                    <span className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
                      <Users className="size-3" />
                      {memberCount}
                    </span>
                    <span className="rounded-md bg-muted/50 px-2 py-1">
                      {activityCount} ativ.
                    </span>
                  </div>

                  {estimatedHours > 0 && (
                    <div className="mb-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="size-3" />
                          Horas registradas
                        </span>
                        <span className="tabular-nums text-foreground">{loggedHours}h / {estimatedHours}h</span>
                      </div>
                      <Progress value={hoursProgress} className="h-1.5" />
                    </div>
                  )}

                  <Separator className="mb-3" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Gerente:</span>
                      <span className="font-medium text-foreground">
                        {getManagerName(project.managerMembershipId)}
                      </span>
                    </div>
                    {lastActivity && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                        <Calendar className="size-3" />
                        {formatDate(lastActivity)}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(ROUTES.TIMESHEET)
                      }}
                    >
                      <Timer className="size-3.5" />
                      Registrar tempo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(buildRoute(ROUTES.PROJECT_DETAIL, { projectId: project.id }))
                      }}
                    >
                      Detalhes
                      <ArrowUpRight className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderKanban className="mb-4 size-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Nenhum projeto encontrado</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Tente ajustar os filtros ou a pesquisa
          </p>
        </div>
      )}
    </div>
  )
}
