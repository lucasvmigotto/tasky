import { useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  FolderKanban,
  Users,
  Calendar,
  Clock,
  User,
  Tag,
  Activity as ActivityIcon,
  Plus,
  BarChart3,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ROUTES, buildRoute } from '@/core/config/routes'
import type { Activity } from '@/core/types/models'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/components/ui/Card'
import { StatCard } from '@/shared/components/charts/StatCard'
import { ChartCard } from '@/shared/components/charts/ChartCard'
import { Avatar, AvatarFallback } from '@/shared/components/ui/Avatar'
import { Separator } from '@/shared/components/ui/Separator'
import { Progress } from '@/shared/components/ui/Progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/Tabs'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { formatDate, formatDateTime } from '@/shared/lib/formatters'
import { cn } from '@/shared/lib/cn'
import { demoProjects } from '@/modules/projects/data/projects.mock'
import { demoActivities } from '@/modules/activities/data/activities.mock'
import { demoMembers } from '@/modules/admin/data/members.mock'
import { demoDepartments } from '@/modules/admin/data/departments.mock'
import { demoProjectAssignments } from '@/modules/projects/data/projects.mock'

function getDepartmentName(departmentId: string): string {
  return demoDepartments.find((d) => d.id === departmentId)?.name ?? 'Desconhecido'
}

function getMemberName(membershipId: string): string {
  return demoMembers.find((m) => m.id === membershipId)?.username ?? 'Desconhecido'
}

function getMemberInitials(membershipId: string): string {
  const name = getMemberName(membershipId)
  return name
    .split(/[._\s]/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getMemberRole(membershipId: string): string {
  return demoMembers.find((m) => m.id === membershipId)?.role ?? 'employee'
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  leader: 'Líder',
  employee: 'Funcionário',
}

const weightConfig: Record<number, { label: string; badge: string }> = {
  1: { label: '1', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  2: { label: '2', badge: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  3: { label: '3', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  5: { label: '5', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  8: { label: '8', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  13: { label: '13', badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

const PIE_COLORS = ['#10B981', '#06B6D4', '#3B82F6', '#F59E0B', '#F97316', '#EF4444']

function getActivityStatus(activity: Activity): string {
  const now = new Date()
  const end = new Date(activity.endDatetime)
  if (end < now) return 'Concluído'
  const start = new Date(activity.startDatetime)
  if (start > now) return 'A Fazer'
  return 'Em Andamento'
}

function getActivityStatusBadge(status: string): { variant: 'success' | 'warning' | 'info'; label: string } {
  if (status === 'Concluído') return { variant: 'success', label: 'Concluído' }
  if (status === 'Em Andamento') return { variant: 'warning', label: 'Em Andamento' }
  return { variant: 'info', label: 'A Fazer' }
}

export default function ProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()

  const project = useMemo(
    () => demoProjects.find((p) => p.id === projectId) ?? null,
    [projectId],
  )

  const projectActivities = useMemo(
    () => demoActivities.filter((a) => a.projectId === projectId),
    [projectId],
  )

  const projectMembershipIds = useMemo(() => {
    const assignment = demoProjectAssignments.find((pa) => pa.projectId === projectId)
    return assignment?.membershipIds ?? []
  }, [projectId])

  const projectMembers = useMemo(
    () => demoMembers.filter((m) => projectMembershipIds.includes(m.id)),
    [projectMembershipIds],
  )

  const activityCount = projectActivities.length
  const totalWeight = projectActivities.reduce((sum, a) => sum + a.weight, 0)
  const estimatedHours = totalWeight * 4

  const weightDistribution = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const a of projectActivities) {
      counts[a.weight] = (counts[a.weight] ?? 0) + 1
    }
    return Object.entries(counts).map(([weight, count]) => ({
      name: `Peso ${weight}`,
      value: count,
      weight: Number(weight),
    }))
  }, [projectActivities])

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = { 'Concluído': 0, 'Em Andamento': 0, 'A Fazer': 0 }
    for (const a of projectActivities) {
      const status = getActivityStatus(a)
      counts[status]++
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [projectActivities])

  const completedCount = statusDistribution.find((s) => s.name === 'Concluído')?.value ?? 0
  const completionPct = activityCount > 0 ? Math.round((completedCount / activityCount) * 100) : 0

  if (!project) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Projeto não encontrado">
          <Button variant="outline" onClick={() => navigate(ROUTES.PROJECTS)}>
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
        </PageHeader>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={project.name}>
        <Button variant="outline" onClick={() => navigate(ROUTES.PROJECTS)}>
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard
          label="Atividades"
          value={activityCount}
          icon={ActivityIcon}
        />
        <StatCard
          label="Horas Estimadas"
          value={estimatedHours}
          icon={Clock}
          formatValue={(v) => `${v}h`}
        />
        <StatCard
          label="Peso Total"
          value={totalWeight}
          icon={BarChart3}
        />
        <StatCard
          label="Conclusão"
          value={completionPct}
          icon={BarChart3}
          formatValue={(v) => `${v}%`}
          trend={completionPct > 50 ? 'up' : 'down'}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/5 to-transparent p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                <FolderKanban className="size-7" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{project.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FolderKanban className="size-3.5" />
                    {getDepartmentName(project.departmentId)}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="size-3.5" />
                    {getMemberName(project.managerMembershipId)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    Criado em {formatDate(project.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <Badge
              variant={project.isActive ? 'success' : 'secondary'}
              className="text-xs shadow-sm"
            >
              {project.isActive ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
        {activityCount > 0 && (
          <div className="border-t border-border/50 px-5 py-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso do projeto</span>
              <span className="tabular-nums font-medium text-foreground">{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-2" />
          </div>
        )}
      </Card>

      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">
            <ActivityIcon className="size-4" />
            Atividades
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="size-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="size-4" />
            Membros
          </TabsTrigger>
          <TabsTrigger value="info">
            <FolderKanban className="size-4" />
            Informações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Atividades do Projeto</CardTitle>
                <CardDescription>{activityCount} atividades encontradas</CardDescription>
              </div>
              <Link to={ROUTES.ACTIVITIES}>
                <Button size="sm" className="h-9 text-xs">
                  <Plus className="size-3.5" />
                  Nova Atividade
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {projectActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ActivityIcon className="mb-3 size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma atividade neste projeto
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {projectActivities.map((a, i) => {
                    const status = getActivityStatus(a)
                    const sb = getActivityStatusBadge(status)
                    const wc = weightConfig[a.weight]
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                      >
                        <Link
                          to={buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: a.id })}
                          className="flex items-center gap-4 rounded-lg border border-border p-3 transition-all hover:border-primary/30 hover:bg-accent/30 hover:shadow-sm"
                        >
                          <div className="flex flex-1 flex-col min-w-0 gap-1">
                            <span className="text-sm font-medium text-foreground truncate">
                              {a.title}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none shadow-sm',
                                  wc?.badge,
                                )}
                              >
                                {wc?.label}
                              </span>
                              <Badge variant={sb.variant} className="text-[10px] px-1.5 py-0 leading-none">
                                {sb.label}
                              </Badge>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="size-3" />
                                {getMemberName(a.assignedTo)}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(a.startDatetime)}
                          </span>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Distribuição de Pesos" subtitle="Atividades por peso (Fibonacci)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={weightDistribution}
                      cx="50%"
                      cy="45%"
                      innerRadius={48}
                      outerRadius={74}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {weightDistribution.map((entry, i) => (
                        <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--popover-foreground)',
                        fontSize: '13px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {weightDistribution.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Status das Atividades" subtitle="Concluído vs Pendente">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} axisLine={false} tickLine={false} width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--popover-foreground)',
                        fontSize: '13px',
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={32}>
                      {statusDistribution.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.name === 'Concluído' ? '#10B981'
                            : entry.name === 'Em Andamento' ? '#F59E0B'
                            : '#3B82F6'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Membros do Projeto</CardTitle>
              <CardDescription>{projectMembers.length} membros atribuídos</CardDescription>
            </CardHeader>
            <CardContent>
              {projectMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="mb-3 size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum membro atribuído a este projeto
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {projectMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/20 hover:border-primary/30"
                    >
                      <Avatar className="size-10 shadow-sm">
                        <AvatarFallback className="text-xs">
                          {getMemberInitials(m.id)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {m.username}
                        </p>
                        <Badge variant="secondary" className="mt-0.5 text-[10px] px-1.5 py-0 leading-none">
                          {roleLabels[m.role] ?? m.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {project.description && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Descrição</span>
                  <p className="mt-1 text-sm text-foreground leading-relaxed">{project.description}</p>
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Departamento</span>
                  <p className="mt-1 text-sm text-foreground">
                    {getDepartmentName(project.departmentId)}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Gerente</span>
                  <p className="mt-1 text-sm text-foreground">
                    {getMemberName(project.managerMembershipId)}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <div className="mt-1">
                    <Badge
                      variant={project.isActive ? 'success' : 'secondary'}
                      className="text-xs"
                    >
                      {project.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Criado em</span>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {formatDateTime(project.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">ID do Projeto</span>
                  <p className="mt-1 text-sm text-muted-foreground font-mono">{project.id}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Atividades</span>
                  <p className="mt-1 text-sm text-foreground">{activityCount} atividades</p>
                </div>
              </div>
              <Separator />
              <div>
                <span className="text-xs font-medium text-muted-foreground">Resumo de Pesos</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {([1, 2, 3, 5, 8, 13] as const).map((w) => {
                    const count = projectActivities.filter((a) => a.weight === w).length
                    if (count === 0) return null
                    const wc = weightConfig[w]
                    return (
                      <span
                        key={w}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shadow-sm',
                          wc?.badge,
                        )}
                      >
                        Peso {w}: {count}
                      </span>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
