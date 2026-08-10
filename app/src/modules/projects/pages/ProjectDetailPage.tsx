import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  FolderKanban,
  Users,
  Calendar,
  Clock,
  User,
  Activity as ActivityIcon,
  BarChart3,
  Repeat2,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ROUTES } from '@/core/config/routes'
import { useAuthStore } from '@/core/auth/authStore'
import {
  useProject,
  useActivities,
  useProjectAssignments,
  useMemberships,
  useDepartments,
  useActivityTemplates,
  useCreateActivityTemplate,
  useActivityTemplate,
} from '@/core/api/hooks'
import type { ActivityResponse, UUID } from '@/core/api/types'
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
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/Tabs'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { formatDate, formatDateTime } from '@/shared/lib/formatters'
import { cn } from '@/shared/lib/cn'
import { ProjectActivitiesWorkspace } from '@/modules/projects/components/ProjectActivitiesWorkspace'
import { DocumentationPanel } from '@/shared/components/documentation/DocumentationPanel'
import { STATUS_LABELS } from '@/shared/components/kanban/ActivityCard'

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
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

export default function ProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { data: project, isLoading } = useProject(projectId as UUID)
  const activitiesQuery = useActivities(projectId as UUID)
  const projectActivities = activitiesQuery.data ?? []
  const { data: assignments = [] } = useProjectAssignments(projectId as UUID)
  const { data: members = [] } = useMemberships(orgId as UUID)
  const { data: departments = [] } = useDepartments(orgId as UUID)
  const templatesQuery = useActivityTemplates(projectId as UUID)
  const createTemplate = useCreateActivityTemplate()
  const useTemplate = useActivityTemplate()
  const [templateSourceId, setTemplateSourceId] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY'>('WEEKLY')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [timezone, setTimezone] = useState(activeOrg?.timezone ?? 'UTC')
  const [nextOccurrence, setNextOccurrence] = useState('')

  async function handleCreateTemplate(event: FormEvent) {
    event.preventDefault()
    if (!templateSourceId || !templateName.trim()) return
    if (recurring && !nextOccurrence) {
      toast.error('Informe a próxima ocorrência')
      return
    }
    try {
      await createTemplate.mutateAsync({
        activityId: templateSourceId,
        data: {
          name: templateName.trim(),
          recurrence: recurring ? {
            frequency,
            interval: recurrenceInterval,
            timezone,
            nextOccurrence: new Date(nextOccurrence).toISOString(),
          } : undefined,
        },
      })
      setTemplateName('')
      toast.success('Modelo criado')
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao criar modelo')
    }
  }

  async function handleUseTemplate(templateId: UUID) {
    try {
      await useTemplate.mutateAsync({ templateId, occurrenceAt: new Date().toISOString() })
      toast.success('Atividade criada pelo modelo')
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao usar modelo')
    }
  }

  const projectMembers = useMemo(
    () => members.filter((m) => assignments.some((a) => a.membershipId === m.id)),
    [members, assignments],
  )

  const getDepartmentName = (id: string) => departments.find((d) => d.id === id)?.name ?? 'Desconhecido'
  const getMemberName = (id: string) => members.find((m) => m.id === id)?.username ?? 'Desconhecido'
  const getMemberInitials = (id: string) => {
    const name = getMemberName(id)
    return name
      .split(/[._\s]/)
      .map((s) => s[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  const getMemberRole = (id: string) => members.find((m) => m.id === id)?.role ?? 'employee'

  const activityCount = projectActivities.length
  const totalWeight = projectActivities.reduce((sum, a) => sum + a.weight, 0)
  const estimatedHours = Math.round((projectActivities.reduce((sum, activity) => sum + activity.estimatedSeconds, 0) / 3600) * 10) / 10

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
    const counts: Record<ActivityResponse['status'], number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_TESTING: 0,
      BLOCKED: 0,
      DONE: 0,
      CANCELED: 0,
    }
    for (const a of projectActivities) {
      counts[a.status]++
    }
    return Object.entries(counts).map(([status, value]) => ({
      status: status as ActivityResponse['status'],
      name: STATUS_LABELS[status as ActivityResponse['status']],
      value,
    }))
  }, [projectActivities])

  const completedCount = statusDistribution.find((item) => item.status === 'DONE')?.value ?? 0
  const completionPct = activityCount > 0 ? Math.round((completedCount / activityCount) * 100) : 0

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Carregando projeto...">
          <Button variant="outline" onClick={() => navigate(ROUTES.PROJECTS)}>
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
        </PageHeader>
      </div>
    )
  }

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
                    {project.managerMembershipId ? getMemberName(project.managerMembershipId) : 'Sem responsável'}
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

      <Tabs defaultValue="work">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="work">
            <ActivityIcon className="size-4" />
            Trabalho
          </TabsTrigger>
          <TabsTrigger value="overview">
            <BarChart3 className="size-4" />
            Visão geral
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="size-4" />
            Membros
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Repeat2 className="size-4" />
            Modelos
          </TabsTrigger>
          <TabsTrigger value="docs">
            <BookOpen className="size-4" />
            Documentação
          </TabsTrigger>
          <TabsTrigger value="info">
            <FolderKanban className="size-4" />
            Informações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work">
          <ProjectActivitiesWorkspace
            project={project}
            activities={projectActivities}
            members={members}
            isLoading={activitiesQuery.isLoading}
            error={activitiesQuery.error}
          />
        </TabsContent>

        <TabsContent value="docs">
          <DocumentationPanel projectId={project.id} />
        </TabsContent>

        <TabsContent value="overview">
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
                            entry.status === 'DONE' ? '#10B981'
                            : entry.status === 'IN_PROGRESS' ? '#F59E0B'
                            : entry.status === 'BLOCKED' ? '#EF4444'
                            : entry.status === 'CANCELED' ? '#64748B'
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
                          {roleLabels[getMemberRole(m.id)] ?? getMemberRole(m.id)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Modelos de atividade</CardTitle>
                <CardDescription>Crie atividades neste projeto mantendo responsável, estimativa e duração.</CardDescription>
              </CardHeader>
              <CardContent aria-live="polite">
                {templatesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando modelos...</p>
                ) : templatesQuery.isError ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3">
                    <p className="text-sm text-destructive">Não foi possível carregar os modelos.</p>
                    <Button variant="outline" size="sm" onClick={() => templatesQuery.refetch()}>Tentar novamente</Button>
                  </div>
                ) : templatesQuery.data?.length ? (
                  <div className="flex flex-col gap-3">
                    {templatesQuery.data.map((template) => (
                      <article key={template.id} className="rounded-lg border border-border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold">{template.name}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{template.title} · versão {template.version}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Duração: {Math.round(template.durationSeconds / 60)} min · Estimativa: {Math.round(template.estimatedSeconds / 60)} min
                            </p>
                            {template.recurrence && (
                              <p className="mt-2 text-xs text-primary">
                                {template.recurrence.frequency === 'DAILY' ? 'Diária' : 'Semanal'} a cada {template.recurrence.interval} · {template.recurrence.timezone}
                                {' · próxima '}{formatDateTime(template.recurrence.nextOccurrence)}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={useTemplate.isPending}
                            onClick={() => handleUseTemplate(template.id)}
                          >
                            Usar agora
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum modelo criado para este projeto.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Novo modelo</CardTitle>
                <CardDescription>Capture uma versão imutável de uma atividade existente.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4" onSubmit={handleCreateTemplate}>
                  <Select
                    label="Atividade de origem"
                    value={templateSourceId}
                    onChange={(event) => setTemplateSourceId(event.target.value)}
                    options={projectActivities.map((activity) => ({ value: activity.id, label: activity.title }))}
                    placeholder="Selecione uma atividade"
                    required
                  />
                  <Input label="Nome do modelo" value={templateName} onChange={(event) => setTemplateName(event.target.value)} required maxLength={150} />
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} />
                    Gerar atividades automaticamente
                  </label>
                  {recurring && (
                    <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
                      <legend className="px-1 text-sm font-medium">Recorrência</legend>
                      <Select
                        label="Frequência"
                        value={frequency}
                        onChange={(event) => setFrequency(event.target.value as 'DAILY' | 'WEEKLY')}
                        options={[{ value: 'DAILY', label: 'Diária' }, { value: 'WEEKLY', label: 'Semanal' }]}
                      />
                      <Input label="Intervalo" type="number" min={1} value={recurrenceInterval} onChange={(event) => setRecurrenceInterval(Number(event.target.value))} required />
                      <Input label="Timezone IANA" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="America/Sao_Paulo" required />
                      <Input label="Próxima ocorrência" type="datetime-local" value={nextOccurrence} onChange={(event) => setNextOccurrence(event.target.value)} required />
                    </fieldset>
                  )}
                  <Button type="submit" disabled={createTemplate.isPending || projectActivities.length === 0}>
                    <Repeat2 className="size-4" />
                    {createTemplate.isPending ? 'Criando...' : 'Criar modelo'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
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
                  <span className="text-xs font-medium text-muted-foreground">Responsável</span>
                  <p className="mt-1 text-sm text-foreground">
                    {project.managerMembershipId ? getMemberName(project.managerMembershipId) : '—'}
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
