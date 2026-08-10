import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitBranch, Loader2 } from 'lucide-react'
import { ROUTES, buildRoute } from '@/core/config/routes'
import { useActivityQuery, useProjects } from '@/core/api/hooks'
import { useAuthStore } from '@/core/auth/authStore'
import type { UUID } from '@/core/api/types'
import { GanttChart } from '@/shared/components/activities/GanttChart'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Select } from '@/shared/components/ui/Select'
import { Badge } from '@/shared/components/ui/Badge'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { QueryState } from '@/shared/components/feedback/QueryState'
import { formatDateTime } from '@/shared/lib/formatters'

const STATUS_LABELS: Record<string, string> = {
  TODO: 'A Fazer',
  IN_PROGRESS: 'Em Andamento',
  DONE: 'Concluído',
  BLOCKED: 'Bloqueado',
  CANCELED: 'Cancelado',
}

export default function TimelinePage() {
  const navigate = useNavigate()
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null
  const [projectId, setProjectId] = useState('all')

  const { data: projects = [] } = useProjects(orgId as UUID)
  const { data: activities = [], isLoading, error } = useActivityQuery(projectId === 'all' ? {} : { projectId: projectId as UUID })

  const dependencies = useMemo(() => {
    return activities.flatMap((activity) =>
      (activity.parentIds ?? []).map((parentId) => ({
        id: `${activity.id}-${parentId}`,
        parentActivityId: parentId,
        childActivityId: activity.id,
      })),
    )
  }, [activities])

  const sorted = useMemo(() => {
    return activities.slice().sort((a, b) => a.startDatetime.localeCompare(b.startDatetime))
  }, [activities])

  if (isLoading) {
    return <Skeleton className="h-[420px] w-full" />
  }

  if (error) {
    return <EmptyState icon={GitBranch} title="Falha ao carregar timeline" description={error.message} />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Timeline" description="Visualize atividades, datas planejadas e dependências em formato Gantt." />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Planejamento</CardTitle>
          <Select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            options={[{ value: 'all', label: 'Todos os projetos' }, ...projects.map((project) => ({ value: project.id, label: project.name }))]}
          />
        </CardHeader>
        <CardContent>
          <QueryState isEmpty={activities.length === 0} emptyTitle="Sem atividades" emptyDescription="Crie atividades com datas para visualizar a timeline.">
            <GanttChart
              activities={activities}
              dependencies={dependencies}
              onActivityClick={(activityId) => navigate(buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId }))}
            />
          </QueryState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alternativa tabular</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Atividade</th>
                <th className="py-2 pr-4">Projeto</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Início</th>
                <th className="py-2 pr-4">Fim</th>
                <th className="py-2 pr-4">Bloqueadores</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((activity) => (
                <tr key={activity.id} className="border-b border-border/40">
                  <td className="py-3 pr-4 font-medium">{activity.title}</td>
                  <td className="py-3 pr-4">{projects.find((project) => project.id === activity.projectId)?.name ?? '-'}</td>
                  <td className="py-3 pr-4"><Badge variant="secondary">{STATUS_LABELS[activity.status]}</Badge></td>
                  <td className="py-3 pr-4">{formatDateTime(activity.startDatetime)}</td>
                  <td className="py-3 pr-4">{formatDateTime(activity.endDatetime)}</td>
                  <td className="py-3 pr-4">{activity.parentIds?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
