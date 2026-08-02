import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, Building2, FolderKanban, Users, Users2 } from 'lucide-react'
import { useSectorOverview, useCapacityMembers } from '@/core/api/hooks'
import type { ActivityPriority, ActivityStatus, MemberCapacityResponse } from '@/core/api/types'
import { ROUTES, buildRoute } from '@/core/config/routes'
import { StatCard } from '@/shared/components/charts/StatCard'
import { QueryState } from '@/shared/components/feedback/QueryState'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/shared/components/kanban/ActivityCard'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Avatar, AvatarFallback } from '@/shared/components/ui/Avatar'
import { Badge } from '@/shared/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { DataTable } from '@/shared/components/ui/DataTable'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Progress } from '@/shared/components/ui/Progress'
import { formatDate } from '@/shared/lib/formatters'

const ROLE_LABELS = {
  admin: 'Administrador',
  manager: 'Chefe de setor',
  leader: 'Líder de equipe',
  employee: 'Colaborador',
}

export default function MySectorPage() {
  const navigate = useNavigate()
  const overviewQuery = useSectorOverview()
  const overview = overviewQuery.data

  const capacityRange = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return { from: monday.toISOString(), to: sunday.toISOString() }
  }, [])
  const capacityQuery = useCapacityMembers(capacityRange)
  const capacityByMembership = useMemo(() => {
    const map = new Map<string, MemberCapacityResponse>()
    for (const capacity of capacityQuery.data ?? []) map.set(capacity.membershipId, capacity)
    return map
  }, [capacityQuery.data])
  const capacityAvailable = (capacityQuery.data?.length ?? 0) > 0

  const counts = overview?.activityCounts
  const openActivities = (counts?.TODO ?? 0) + (counts?.IN_PROGRESS ?? 0) + (counts?.BLOCKED ?? 0)
  const departmentNames = overview?.departments.map((department) => department.name).join(', ') ?? ''
  const maxEstimated = useMemo(() => Math.max(1, ...(overview?.members.map((member) => member.estimatedSeconds) ?? [1])), [overview?.members])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Meu Setor"
        description={departmentNames ? `Visão operacional de ${departmentNames}` : 'Sua lotação principal na organização'}
      />

      <QueryState isLoading={overviewQuery.isLoading} error={overviewQuery.error} isEmpty={false}>
        {!overview || overview.departments.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Lotação não configurada"
            description="Seu usuário ainda não possui um setor válido. Procure o administrador da organização."
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{ROLE_LABELS[overview.role]}</Badge>
              {overview.departments.map((department) => <Badge key={department.id} variant="outline">{department.name}</Badge>)}
              {overview.teams.map((team) => <Badge key={team.id} variant="outline">Equipe {team.name}</Badge>)}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard label="Pessoas" value={overview.members.length} icon={Users} />
              <StatCard label="Equipes" value={overview.teams.length} icon={Users2} />
              <StatCard label="Projetos ativos" value={overview.projects.length} icon={FolderKanban} />
              <StatCard label="Atividades abertas" value={openActivities} icon={Activity} />
              <StatCard label="Bloqueadas" value={counts?.BLOCKED ?? 0} icon={AlertTriangle} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Fila do setor</CardTitle>
                  <CardDescription>Próximas atividades abertas dentro do seu escopo</CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    className="overflow-x-auto"
                    rows={overview.queue}
                    keyExtractor={(activity) => activity.id}
                    onRowClick={(activity) => navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: activity.id }))}
                    emptyTitle="Nenhuma atividade aberta"
                    emptyDescription="Não há trabalho pendente no escopo atual."
                    columns={[
                      { key: 'title', header: 'Atividade', className: 'min-w-56', render: (activity) => <div><p className="font-medium">{activity.title}</p><p className="text-xs text-muted-foreground">{activity.projectName}</p></div> },
                      { key: 'status', header: 'Status', render: (activity) => <Badge variant="secondary">{STATUS_LABELS[activity.status as ActivityStatus]}</Badge> },
                      { key: 'priority', header: 'Prioridade', render: (activity) => <Badge variant={activity.priority === 'URGENT' ? 'destructive' : activity.priority === 'HIGH' ? 'warning' : 'outline'}>{PRIORITY_LABELS[activity.priority as ActivityPriority]}</Badge> },
                      { key: 'assigneeName', header: 'Responsável', className: 'min-w-36' },
                      { key: 'dueDate', header: 'Prazo', render: (activity) => activity.dueDate ? formatDate(activity.dueDate) : <span className="text-muted-foreground">Sem prazo</span> },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Carga planejada</CardTitle>
                  <CardDescription>
                    {capacityAvailable
                      ? 'Estimativas e utilização da capacidade real dos membros'
                      : 'Estimativas das atividades abertas por pessoa'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {overview.members.map((member) => {
                    const hours = Math.round((member.estimatedSeconds / 3600) * 10) / 10
                    const progress = Math.round((member.estimatedSeconds / maxEstimated) * 100)
                    const capacity = capacityByMembership.get(member.id)
                    return (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar className="size-9"><AvatarFallback>{initials(member.displayName)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                            <span className="truncate font-medium">{member.displayName}</span>
                            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                              {hours}h · {member.openActivities} tarefas
                              {capacity && (
                                <Badge variant={capacity.overloadSeconds > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                                  Utilização {Math.round(capacity.utilization)}%
                                </Badge>
                              )}
                            </span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                          {capacity && (
                            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>
                                {Math.round(capacity.availableSeconds / 3600)}h disponíveis ·{' '}
                                {Math.round(capacity.actualSeconds / 3600)}h registradas
                              </span>
                              {capacity.overloadSeconds > 0 && (
                                <span className="font-medium text-destructive">
                                  Sobrecarga {Math.round(capacity.overloadSeconds / 3600)}h
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Equipes</CardTitle><CardDescription>Estrutura dentro do seu escopo</CardDescription></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {overview.teams.length > 0 ? overview.teams.map((team) => (
                    <article key={team.id} className="rounded-lg border border-border/60 p-4">
                      <div className="flex items-center justify-between gap-3"><h3 className="font-medium">{team.name}</h3><Badge variant="secondary">{team.memberCount} pessoas</Badge></div>
                    </article>
                  )) : <p className="text-sm text-muted-foreground">Nenhuma equipe vinculada.</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Projetos ativos</CardTitle><CardDescription>Projetos visíveis dentro da lotação</CardDescription></CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {overview.projects.length > 0 ? overview.projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => navigate(buildRoute(ROUTES.PROJECT_DETAIL, { projectId: project.id }))}
                      className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="font-medium">{project.name}</span>
                      <Badge variant="success">Ativo</Badge>
                    </button>
                  )) : <p className="text-sm text-muted-foreground">Nenhum projeto ativo disponível.</p>}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </QueryState>
    </div>
  )
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join('').toUpperCase().slice(0, 2)
}
