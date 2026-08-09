import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, CalendarDays, CheckCircle2, Clock, FolderKanban, ListChecks, Timer } from 'lucide-react'
import { ROUTES, buildRoute } from '@/core/config/routes'
import { useAuthStore } from '@/core/auth/authStore'
import { useActivityQuery, useProjects, useRequests, useTimeEntries } from '@/core/api/hooks'
import type { ActivityResponse, UUID } from '@/core/api/types'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { dateKeyInTimeZone, getEffectiveTimeZone, zonedDateTimeToIso } from '@/shared/lib/timezone'

const STATUS_LABELS: Record<string, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluída',
  BLOCKED: 'Bloqueada',
  CANCELED: 'Cancelada',
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  NEW: 'Nova',
  TRIAGE: 'Em triagem',
  PLANNED: 'Planejada',
  IN_PROGRESS: 'Em execução',
  BLOCKED: 'Bloqueada',
  DONE: 'Concluída',
  CANCELED: 'Cancelada',
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

function getActivityTime(activity: ActivityResponse) {
  return Math.max(0, (Date.parse(activity.endDatetime) - Date.parse(activity.startDatetime)) / 3600000)
}

export default function MyWorkPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null
  const timeZone = getEffectiveTimeZone(activeOrg?.timezone)
  const today = dateKeyInTimeZone(new Date(), timeZone)
  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfWeek(new Date())

  const { data: projects = [], isLoading: projectsLoading } = useProjects(orgId as UUID)
  const { data: activities = [], isLoading: activitiesLoading } = useActivityQuery(orgId ? {} : null)
  const { data: requestsPage, isLoading: requestsLoading } = useRequests(orgId ? { size: 50, mine: true } : null)
  const { data: entries = [], isLoading: entriesLoading } = useTimeEntries(orgId ? {
    from: zonedDateTimeToIso(dateKeyInTimeZone(weekStart, timeZone), '00:00', timeZone),
    to: zonedDateTimeToIso(dateKeyInTimeZone(weekEnd, timeZone), '23:59', timeZone),
  } : null)

  const myRequests = requestsPage?.content ?? []
  const isLoading = projectsLoading || activitiesLoading || entriesLoading || requestsLoading

  const openActivities = useMemo(
    () => activities.filter((item) => item.status !== 'DONE' && item.status !== 'CANCELED'),
    [activities],
  )
  const todayActivities = useMemo(
    () => openActivities.filter((item) => dateKeyInTimeZone(item.startDatetime, timeZone) <= today && dateKeyInTimeZone(item.endDatetime, timeZone) >= today),
    [openActivities, timeZone, today],
  )
  const blocked = openActivities.filter((item) => item.status === 'BLOCKED')
  const weekHours = entries.reduce((sum, entry) => sum + ((entry.durationSeconds ?? 0) / 3600), 0)
  const plannedWeekHours = activities.reduce((sum, activity) => sum + getActivityTime(activity), 0)

  const projectName = (projectId: string) => projects.find((project) => project.id === projectId)?.name ?? 'Projeto'

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28" />)}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.22),transparent_36%),linear-gradient(135deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">Operação interna</Badge>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Meu trabalho, {user?.displayName?.split(' ')[0] ?? 'usuário'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Central para acompanhar tarefas, demandas entre equipes, projetos em andamento e horas apontadas nesta semana.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(ROUTES.ACTIVITIES)}>
              <ListChecks className="size-4" />
              Ver tarefas
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ListChecks} label="Tarefas abertas" value={openActivities.length} tone="violet" />
        <MetricCard icon={CalendarDays} label="Para hoje" value={todayActivities.length} tone="sky" />
        <MetricCard icon={Timer} label="Horas na semana" value={`${weekHours.toFixed(1)}h`} tone="emerald" />
        <MetricCard icon={Clock} label="Planejado" value={`${plannedWeekHours.toFixed(1)}h`} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60">
            <div>
              <CardTitle>Fila de execução</CardTitle>
              <CardDescription>Tarefas abertas de projetos e demandas internas.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.ACTIVITIES)}>
              Abrir quadro <ArrowRight className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {openActivities.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma tarefa aberta no momento.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {openActivities.slice(0, 8).map((activity) => (
                  <button
                    key={activity.id}
                    className="grid w-full grid-cols-1 gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30 md:grid-cols-[1fr_150px_110px] md:items-center"
                    onClick={() => navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: activity.id }))}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{projectName(activity.projectId)}</p>
                    </div>
                    <Badge variant={activity.status === 'BLOCKED' ? 'destructive' : activity.status === 'IN_PROGRESS' ? 'warning' : 'secondary'} className="w-fit">
                      {STATUS_LABELS[activity.status] ?? activity.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground md:text-right">
                      {new Date(activity.endDatetime).toLocaleDateString('pt-BR')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Demandas atribuídas a mim</CardTitle>
              <CardDescription>Pedidos de trabalho em que você está como responsável.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {myRequests.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma demanda atribuída a você.</p>
              ) : (
                <div className="space-y-2">
                  {myRequests.slice(0, 4).map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{req.title}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{req.requestKey}</p>
                      </div>
                      <Badge variant={req.status === 'BLOCKED' ? 'destructive' : req.status === 'IN_PROGRESS' ? 'default' : 'secondary'} className="ml-2 shrink-0 text-[10px]">
                        {REQUEST_STATUS_LABELS[req.status] ?? req.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <Button className="w-full justify-between" variant="outline" onClick={() => navigate(ROUTES.REQUESTS)}>
                Abrir fila de demandas <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
              <CardDescription>Pontos que precisam de atenção.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AlertRow icon={Clock} label="Tarefas bloqueadas" value={blocked.length} />
              <AlertRow icon={FolderKanban} label="Projetos ativos" value={projects.filter((project) => project.isActive).length} />
              <AlertRow icon={CheckCircle2} label="Registros da semana" value={entries.length} />
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof ListChecks; label: string; value: string | number; tone: 'violet' | 'sky' | 'emerald' | 'amber' }) {
  const tones = {
    violet: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
    sky: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  }
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex size-11 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function AlertRow({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-foreground">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </div>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}
