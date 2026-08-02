import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Clock, BarChart3, Users, Tag, TrendingUp, Download, Loader2, Target, CircleDollarSign } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { StatCard } from '@/shared/components/charts/StatCard'
import { ChartCard } from '@/shared/components/charts/ChartCard'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/Tabs'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Progress } from '@/shared/components/ui/Progress'
import { useProjects, useMemberships, useReportSummary, useReportDetailed, downloadReportCsv, useReportProjectFinancials, useReportApprovalGrouping, useReportBillableGrouping } from '@/core/api/hooks'
import type { UUID } from '@/core/api/types'
import { formatCurrency } from '@/shared/lib/formatters'
import { cn } from '@/shared/lib/cn'
import { toast } from 'sonner'

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899']
const PROJECT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4', '#84CC16']

function startOfWeek() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

function endOfWeek() {
  const now = new Date()
  const day = now.getDay()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() + (day === 0 ? 0 : 7 - day))
  sunday.setHours(0, 0, 0, 0)
  return sunday.toISOString().split('T')[0]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function ReportsPage() {
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const [from, setFrom] = useState(startOfWeek())
  const [to, setTo] = useState(endOfWeek())
  const [projectId, setProjectId] = useState('')
  const [membershipId, setMembershipId] = useState('')
  const [exporting, setExporting] = useState(false)

  const { data: projects = [] } = useProjects(orgId as UUID)
  const { data: members = [] } = useMemberships(orgId as UUID)

  const params = useMemo(() => ({
    from: new Date(`${from}T00:00:00.000Z`).toISOString(),
    to: new Date(`${to}T23:59:59.999Z`).toISOString(),
    projectId: projectId || undefined,
    membershipId: membershipId || undefined,
  }), [from, to, projectId, membershipId])

  const { data, isLoading, error } = useReportSummary(params)
  const { data: detailed, isLoading: detailedLoading } = useReportDetailed(params)
  const projectFinancialsQuery = useReportProjectFinancials(params)
  const approvalGroupingQuery = useReportApprovalGrouping(params)
  const billableGroupingQuery = useReportBillableGrouping(params)

  const projectHours = useMemo(
    () => (data?.projectHours ?? []).map((p, i) => ({ ...p, color: PROJECT_COLORS[i % PROJECT_COLORS.length] })),
    [data],
  )

  const totalHours = data?.totalHours ?? 0
  const billableHours = data?.billableHours ?? 0
  const nonBillableHours = data?.nonBillableHours ?? 0
  const totalActivities = data?.totalActivities ?? 0
  const dailyAverage = data?.dailyAverage ?? 0
  const memberProductivity = data?.memberProductivity ?? []
  const weeklyHours = data?.weeklyHours ?? []
  const labelDistribution = data?.labelDistribution ?? []

  const topMember = useMemo(
    () => memberProductivity.reduce((best, m) => (m.hours > best.hours ? m : best), { name: '—', hours: 0, activities: 0 }),
    [memberProductivity],
  )

  async function handleExport() {
    setExporting(true)
    try {
      await downloadReportCsv(params)
      toast.success('Relatório exportado')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao exportar')
    } finally {
      setExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Relatórios" description="Análise de horas, produtividade e distribuição" />
        <EmptyState icon={BarChart3} title="Falha ao carregar relatórios" description={error.message} />
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader title="Relatórios" description="Análise de horas, produtividade e distribuição">
        <Button onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Exportar CSV
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/50 bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="De" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Até" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select
          label="Projeto"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Todos os projetos"
          options={[
            { value: '', label: 'Todos os projetos' },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <Select
          label="Membro"
          value={membershipId}
          onChange={(e) => setMembershipId(e.target.value)}
          placeholder="Todos os membros"
          options={[
            { value: '', label: 'Todos os membros' },
            ...members.map((m) => ({ value: m.id, label: m.username })),
          ]}
        />
      </div>

      <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5" variants={containerVariants}>
        <motion.div variants={itemVariants}>
          <StatCard value={totalHours} label="Total de Horas" icon={Clock} formatValue={(v) => `${v.toFixed(1)}h`} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={billableHours} label="Computadas" icon={TrendingUp} formatValue={(v) => `${v.toFixed(1)}h`} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={nonBillableHours} label="Não Computadas" icon={BarChart3} formatValue={(v) => `${v.toFixed(1)}h`} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={totalActivities} label="Atividades" icon={BarChart3} formatValue={(v) => String(v)} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={topMember.hours} label="Maior Contribuidor" icon={Users} formatValue={(v) => `${v.toFixed(1)}h`} trendValue={topMember.name.split(' ')[0]} />
        </motion.div>
      </motion.div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="detailed">Detalhado</TabsTrigger>
          <TabsTrigger value="planned">Planejado vs Real</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Horas por Período" subtitle="Distribuição diária">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 13 }} formatter={(value: number) => [`${value}h`, 'Horas']} />
                    <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Horas por Projeto" subtitle="Distribuição percentual">
              <div className="h-72">
                {projectHours.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem horas registradas no período.</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={projectHours} cx="50%" cy="45%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="hours" nameKey="project" stroke="none">
                          {projectHours.map((entry) => <Cell key={entry.project} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 13 }} formatter={(value: number) => [`${value}h`, 'Horas']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                      {projectHours.map((entry) => (
                        <div key={entry.project} className="flex items-center gap-1.5 text-xs">
                          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-muted-foreground">{entry.project}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Produtividade por Membro" subtitle="Horas registradas">
              <div className="h-72">
                {memberProductivity.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados de membros.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={memberProductivity} layout="vertical" margin={{ left: 80, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} axisLine={false} tickLine={false} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 13 }} formatter={(value: number) => [`${value}h`, 'Horas']} />
                      <Bar dataKey="hours" fill="#3B82F6" radius={[0, 4, 4, 0]} name="hours" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Distribuição por Label" subtitle="Atividades por categoria">
              <div className="h-72">
                {labelDistribution.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem atividades com label.</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={labelDistribution} cx="50%" cy="45%" outerRadius={82} paddingAngle={2} dataKey="count" nameKey="label" stroke="none">
                          {labelDistribution.map((entry, i) => <Cell key={entry.label} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 13 }} formatter={(value: number) => [value, 'Atividades']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                      {labelDistribution.map((entry, i) => (
                        <div key={entry.label} className="flex items-center gap-1.5 text-xs">
                          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-muted-foreground">{entry.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="detailed">
          <div className="overflow-x-auto rounded-lg border border-border/50 bg-card">
            {detailedLoading ? (
              <div className="p-6"><Skeleton className="h-64 w-full" /></div>
            ) : (detailed ?? []).length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhum registro no período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Projeto</th>
                    <th className="px-4 py-3 font-medium">Membro</th>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium">Início</th>
                    <th className="px-4 py-3 font-medium">Horas</th>
                    <th className="px-4 py-3 font-medium">Tags</th>
                    <th className="px-4 py-3 font-medium">Computada</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailed ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium">{row.projectName}</td>
                      <td className="px-4 py-2.5">{row.memberName}</td>
                      <td className="max-w-[240px] truncate px-4 py-2.5 text-muted-foreground">{row.description || '—'}</td>
                      <td className="px-4 py-2.5 tabular-nums">{new Date(row.startTime).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2.5 font-semibold tabular-nums">{row.hours.toFixed(2)}h</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {row.tags.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={row.billable ? 'success' : 'secondary'} className="text-[10px]">
                          {row.billable ? 'Sim' : 'Não'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="planned">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/50 bg-card p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Estimado</p>
                <p className="text-lg font-bold tabular-nums text-foreground">{((data?.estimatedSeconds ?? 0) / 3600).toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Realizado</p>
                <p className="text-lg font-bold tabular-nums text-foreground">{((data?.actualSeconds ?? 0) / 3600).toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Progresso</p>
                <div className="mt-1 flex items-center gap-2">
                  <Progress value={data?.progressPercent ?? 0} className="h-2 w-32" showPercentage />
                </div>
              </div>
            </div>

            {projectFinancialsQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : projectFinancialsQuery.error ? (
              <EmptyState icon={Target} title="Sem acesso aos dados financeiros" description={projectFinancialsQuery.error.message} />
            ) : (projectFinancialsQuery.data ?? []).length === 0 ? (
              <EmptyState icon={Target} title="Nenhum projeto com estimativas" description="Não há dados planejados vs reais no período." />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/50 bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Projeto</th>
                      <th className="px-4 py-3 font-medium">Estimado</th>
                      <th className="px-4 py-3 font-medium">Aprovado</th>
                      <th className="px-4 py-3 font-medium">Não aprovado</th>
                      <th className="px-4 py-3 font-medium">Restante</th>
                      <th className="px-4 py-3 font-medium">Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(projectFinancialsQuery.data ?? []).map((row) => (
                      <tr key={row.projectId} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium text-foreground">{row.projectName}</td>
                        <td className="px-4 py-2.5 tabular-nums">{(row.estimatedSeconds / 3600).toFixed(1)}h</td>
                        <td className="px-4 py-2.5 tabular-nums text-emerald-500">{(row.actualApprovedSeconds / 3600).toFixed(1)}h</td>
                        <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{(row.actualNotApprovedSeconds / 3600).toFixed(1)}h</td>
                        <td className="px-4 py-2.5 tabular-nums">{(row.remainingSeconds / 3600).toFixed(1)}h</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Progress value={row.progressPercent} className="h-1.5 w-24" />
                            <span className="text-xs tabular-nums text-muted-foreground">{row.progressPercent.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {approvalGroupingQuery.isLoading || billableGroupingQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="rounded-lg border border-border/50 bg-card p-4">
                  <p className="mb-3 text-sm font-medium text-foreground">Por situação de aprovação</p>
                  {(approvalGroupingQuery.data ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem registros no período.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {(approvalGroupingQuery.data ?? []).map((group) => (
                        <div key={group.approvalStatus} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{APPROVAL_STATUS_LABELS[group.approvalStatus] ?? group.approvalStatus}</span>
                          <span className="tabular-nums text-foreground">{(group.seconds / 3600).toFixed(1)}h · {group.entries} registros</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="rounded-lg border border-border/50 bg-card p-4">
                <p className="mb-3 text-sm font-medium text-foreground">Computadas vs Não computadas</p>
                {(billableGroupingQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem registros no período.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {(billableGroupingQuery.data ?? []).map((group) => (
                      <div key={String(group.billable)} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{group.billable ? 'Computadas' : 'Não computadas'}</span>
                        <span className="tabular-nums text-foreground">{(group.seconds / 3600).toFixed(1)}h · {group.entries} registros</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {projectFinancialsQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : projectFinancialsQuery.error ? (
              <EmptyState icon={CircleDollarSign} title="Sem acesso aos dados financeiros" description={projectFinancialsQuery.error.message} />
            ) : (projectFinancialsQuery.data ?? []).length === 0 ? (
              <EmptyState icon={CircleDollarSign} title="Nenhum dado financeiro" description="Não há custos, receitas ou margens no período." />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/50 bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Projeto</th>
                      <th className="px-4 py-3 font-medium">Custo</th>
                      <th className="px-4 py-3 font-medium">Receita</th>
                      <th className="px-4 py-3 font-medium">Margem</th>
                      <th className="px-4 py-3 font-medium">Orçamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(projectFinancialsQuery.data ?? []).map((row) => (
                      <tr key={row.projectId} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium text-foreground">{row.projectName}</td>
                        <td className="px-4 py-2.5 tabular-nums">{formatCurrency(row.cost)}</td>
                        <td className="px-4 py-2.5 tabular-nums">{formatCurrency(row.revenue)}</td>
                        <td className={cn('px-4 py-2.5 font-semibold tabular-nums', row.margin >= 0 ? 'text-emerald-500' : 'text-destructive')}>
                          {formatCurrency(row.margin)}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                          {row.budgetAmount != null ? formatCurrency(row.budgetAmount) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  LOCKED: 'Bloqueado',
}
