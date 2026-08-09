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
import {
  Clock,
  BarChart3,
  Users,
  TrendingUp,
  Download,
  Loader2,
  CalendarDays,
  Ticket,
} from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { StatCard } from '@/shared/components/charts/StatCard'
import { ChartCard } from '@/shared/components/charts/ChartCard'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  useProjects,
  useMemberships,
  useDepartments,
  useReportSummary,
  useReportDetailed,
  downloadReportCsv,
  useTimeEntries,
} from '@/core/api/hooks'
import type { UUID, ReportSummaryResponse, ReportDetailedRow } from '@/core/api/types'
import { toast } from 'sonner'

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899']

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

const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--popover-foreground)',
  fontSize: 13,
}

export default function ReportsPage() {
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const isManagerOrAdmin = role === 'manager' || role === 'admin'

  return isManagerOrAdmin ? <ManagerReport /> : <CollaboratorReport />
}

function CollaboratorReport() {
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const [from, setFrom] = useState(startOfWeek())
  const [to, setTo] = useState(endOfWeek())
  const [projectId, setProjectId] = useState('')
  const [exporting, setExporting] = useState(false)

  const params = useMemo(() => ({
    from: new Date(`${from}T00:00:00.000Z`).toISOString(),
    to: new Date(`${to}T23:59:59.999Z`).toISOString(),
    projectId: projectId || undefined,
  }), [from, to, projectId])

  const { data, isLoading, error } = useReportSummary(params)
  const { data: projects = [] } = useProjects(orgId as UUID)
  const { data: entries = [] } = useTimeEntries(orgId ? { ...params, size: 5000 } : null)

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? 'Projeto'
  const projectColor = (id: string) => projects.find((p) => p.id === id)?.color ?? '#64748B'

  const weeklyHours = data?.weeklyHours ?? []
  const projectHours = useMemo(
    () => (data?.projectHours ?? []).map((p) => ({ ...p, color: p.color || '#64748B' })),
    [data],
  )
  const totalHours = data?.totalHours ?? 0
  const dailyAverage = data?.dailyAverage ?? 0

  const rows = useMemo(() => {
    return entries
      .map((e) => ({
        id: e.id,
        date: new Date(e.startTime),
        projectId: e.projectId ?? '',
        projectName: e.projectId ? projectName(e.projectId) : 'Sem projeto',
        color: e.projectId ? projectColor(e.projectId) : '#64748B',
        description: e.description || '—',
        glpiTicketId: e.glpiTicketId ?? null,
        hours: (e.durationSeconds ?? 0) / 3600,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [entries, projects])

  const workedDays = useMemo(() => new Set(rows.map((r) => r.date.toDateString())).size, [rows])

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Meu Relatório" description="Sua semana de trabalho" />
        <EmptyState icon={BarChart3} title="Falha ao carregar relatório" description={error.message} />
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader title="Meu Relatório" description="Horas registradas na semana">
        <Button onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Exportar CSV
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/50 bg-card p-4 sm:grid-cols-3">
        <Input label="De" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Até" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select
          label="Projeto"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Todos os projetos"
          options={[
            { value: '', label: 'Todos os projetos' },
            ...projects.map((p) => ({ value: p.id, label: p.name, color: p.color })),
          ]}
        />
      </div>

      <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" variants={containerVariants}>
        <motion.div variants={itemVariants}>
          <StatCard value={totalHours} label="Total de Horas" icon={Clock} formatValue={(v) => `${v.toFixed(1)}h`} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={workedDays} label="Dias com registro" icon={CalendarDays} formatValue={(v) => String(v)} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={dailyAverage} label="Média por dia" icon={TrendingUp} formatValue={(v) => `${v.toFixed(1)}h`} />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Horas por Dia" subtitle="Distribuição na semana">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}h`, 'Horas']} />
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
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}h`, 'Horas']} />
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

      <div className="overflow-x-auto rounded-lg border border-border/50 bg-card">
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nenhum registro no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Projeto</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Chamado GLPI</th>
                <th className="px-4 py-3 text-right font-medium">Horas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                    {row.date.toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                      <span className="font-medium text-foreground">{row.projectName}</span>
                    </span>
                  </td>
                  <td className="max-w-[320px] truncate px-4 py-2.5 text-muted-foreground">{row.description}</td>
                  <td className="px-4 py-2.5">
                    {row.glpiTicketId ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Ticket className="size-3.5" />
                        #{row.glpiTicketId}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{row.hours.toFixed(2)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  )
}

function ManagerReport() {
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const orgId = activeOrg?.id ?? null
  const isAdmin = role === 'admin'

  const [from, setFrom] = useState(startOfWeek())
  const [to, setTo] = useState(endOfWeek())
  const [projectId, setProjectId] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [exporting, setExporting] = useState(false)

  const { data: projects = [] } = useProjects(orgId as UUID)
  const { data: members = [] } = useMemberships(orgId as UUID)
  const { data: departments = [] } = useDepartments(orgId as UUID)

  const singleSector = isAdmin && departments.length === 1 ? departments[0].id : ''
  const sectorId = isAdmin ? (departmentId || singleSector) : ''

  const scopedMembers = useMemo(() => {
    if (!sectorId) return members
    return members.filter((m) => m.primaryDepartmentId === sectorId)
  }, [members, sectorId])

  const params = useMemo(() => ({
    from: new Date(`${from}T00:00:00.000Z`).toISOString(),
    to: new Date(`${to}T23:59:59.999Z`).toISOString(),
    projectId: projectId || undefined,
    membershipId: selectedMemberId || undefined,
    departmentId: sectorId || undefined,
  }), [from, to, projectId, selectedMemberId, sectorId])

  const reportParams = isAdmin && !sectorId ? null : params

  const { data, isLoading, error } = useReportSummary(reportParams)
  const { data: detailed, isLoading: detailedLoading } = useReportDetailed(reportParams)

  const projectHours = useMemo(
    () => (data?.projectHours ?? []).map((p) => ({ ...p, color: p.color || '#64748B' })),
    [data],
  )

  const totalHours = data?.totalHours ?? 0
  const dailyAverage = data?.dailyAverage ?? 0
  const totalActivities = data?.totalActivities ?? 0
  const memberProductivity = data?.memberProductivity ?? []
  const weeklyHours = data?.weeklyHours ?? []

  const topMember = useMemo(
    () => memberProductivity.reduce((best, m) => (m.hours > best.hours ? m : best), { name: '—', hours: 0, activities: 0 }),
    [memberProductivity],
  )

  const selectedMember = scopedMembers.find((m) => m.id === selectedMemberId)
  const overviewWorkedDays = useMemo(() => {
    const days = new Set<string>()
    for (const row of detailed ?? []) days.add(new Date(row.startTime).toDateString())
    return days.size
  }, [detailed])

  async function handleExport() {
    if (!reportParams) return
    setExporting(true)
    try {
      await downloadReportCsv(reportParams)
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
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Relatório do Setor" description="Semana da equipe" />
        <EmptyState icon={BarChart3} title="Falha ao carregar relatórios" description={error.message} />
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader title="Relatório do Setor" description="Semana da equipe: horas e produtividade">
        <Button onClick={handleExport} disabled={exporting || (isAdmin && !sectorId)}>
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Exportar CSV
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/50 bg-card p-4 sm:grid-cols-2 xl:grid-cols-3">
        <Input label="De" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Até" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select
          label="Projeto"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Todos os projetos"
          options={[
            { value: '', label: 'Todos os projetos' },
            ...projects.map((p) => ({ value: p.id, label: p.name, color: p.color })),
          ]}
        />
      </div>

      {isAdmin ? (
        <Select
          label="Setor"
          value={sectorId}
          onChange={(e) => {
            setDepartmentId(e.target.value)
            setSelectedMemberId('')
          }}
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
        />
      ) : (
        <p className="rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-muted-foreground">
          Setor do seu escopo (automático)
        </p>
      )}

      {isAdmin && !sectorId ? (
        <EmptyState
          icon={BarChart3}
          title="Selecione um setor"
          description="Escolha o setor acima para visualizar o relatório da equipe."
        />
      ) : (
        <>
          <Select
            label="Ver por membro"
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            options={[
              { value: '', label: 'Visão geral do setor' },
              ...scopedMembers.map((m) => ({ value: m.id, label: m.username })),
            ]}
          />

          {!selectedMemberId ? (
            <div className="flex flex-col gap-6">
              <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5" variants={containerVariants}>
                <motion.div variants={itemVariants}>
                  <StatCard value={totalHours} label="Total de Horas" icon={Clock} formatValue={(v) => `${v.toFixed(1)}h`} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <StatCard value={overviewWorkedDays} label="Dias com registro" icon={CalendarDays} formatValue={(v) => String(v)} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <StatCard value={dailyAverage} label="Média por dia" icon={TrendingUp} formatValue={(v) => `${v.toFixed(1)}h`} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <StatCard value={totalActivities} label="Atividades" icon={BarChart3} formatValue={(v) => String(v)} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <StatCard value={topMember.hours} label="Maior Contribuidor" icon={Users} formatValue={(v) => `${v.toFixed(1)}h`} trendValue={topMember.name.split(' ')[0]} />
                </motion.div>
              </motion.div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ChartCard title="Horas por Período" subtitle="Distribuição diária">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyHours}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}h`, 'Horas']} />
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
                            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}h`, 'Horas']} />
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

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
                          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}h`, 'Horas']} />
                          <Bar dataKey="hours" fill="#3B82F6" radius={[0, 4, 4, 0]} name="hours" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </ChartCard>
              </div>

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
                        <th className="px-4 py-3 font-medium">Chamado GLPI</th>
                        <th className="px-4 py-3 font-medium">Início</th>
                        <th className="px-4 py-3 font-medium">Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailed ?? []).map((row) => (
                        <tr key={row.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                          <td className="px-4 py-2.5">
                            <span className="flex items-center gap-2">
                              <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.projectColor || '#64748B' }} />
                              <span className="font-medium text-foreground">{row.projectName}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2.5">{row.memberName}</td>
                          <td className="max-w-[240px] truncate px-4 py-2.5 text-muted-foreground">{row.description || '—'}</td>
                          <td className="px-4 py-2.5">
                            {row.glpiTicketId ? (
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Ticket className="size-3.5" />
                                #{row.glpiTicketId}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{new Date(row.startTime).toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-2.5 font-semibold tabular-nums">{row.hours.toFixed(2)}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <MemberWeekView
              data={data}
              detailed={detailed ?? []}
              detailedLoading={detailedLoading}
              memberName={selectedMember?.username ?? 'Membro'}
            />
          )}
        </>
      )}
    </motion.div>
  )
}

function MemberWeekView({
  data,
  detailed,
  detailedLoading,
  memberName,
}: {
  data: ReportSummaryResponse | undefined
  detailed: ReportDetailedRow[]
  detailedLoading: boolean
  memberName: string
}) {
  const totalHours = data?.totalHours ?? 0
  const dailyAverage = data?.dailyAverage ?? 0
  const weeklyHours = data?.weeklyHours ?? []
  const projectHours = useMemo(
    () => (data?.projectHours ?? []).map((p) => ({ ...p, color: p.color || '#64748B' })),
    [data],
  )
  const workedDays = useMemo(() => {
    const days = new Set<string>()
    for (const row of detailed) days.add(new Date(row.startTime).toDateString())
    return days.size
  }, [detailed])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard value={totalHours} label="Total de Horas" icon={Clock} formatValue={(v) => `${v.toFixed(1)}h`} />
        <StatCard value={workedDays} label="Dias com registro" icon={CalendarDays} formatValue={(v) => String(v)} />
        <StatCard value={dailyAverage} label="Média por dia" icon={TrendingUp} formatValue={(v) => `${v.toFixed(1)}h`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Horas por Dia" subtitle={`Semana de ${memberName}`}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}h`, 'Horas']} />
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
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}h`, 'Horas']} />
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

      <div className="overflow-x-auto rounded-lg border border-border/50 bg-card">
        {detailedLoading ? (
          <div className="p-6"><Skeleton className="h-64 w-full" /></div>
        ) : detailed.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nenhum registro no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Projeto</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Chamado GLPI</th>
                <th className="px-4 py-3 text-right font-medium">Horas</th>
              </tr>
            </thead>
            <tbody>
              {detailed.map((row) => (
                <tr key={row.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                    {new Date(row.startTime).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.projectColor || '#64748B' }} />
                      <span className="font-medium text-foreground">{row.projectName}</span>
                    </span>
                  </td>
                  <td className="max-w-[320px] truncate px-4 py-2.5 text-muted-foreground">{row.description || '—'}</td>
                  <td className="px-4 py-2.5">
                    {row.glpiTicketId ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Ticket className="size-3.5" />
                        #{row.glpiTicketId}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{row.hours.toFixed(2)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
