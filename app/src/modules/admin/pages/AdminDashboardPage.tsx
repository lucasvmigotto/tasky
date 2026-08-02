import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Users,
  FolderKanban,
  Building2,
  Users2,
  Target,
  ArrowUpRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { ROUTES } from '@/core/config/routes'
import { useAuthStore } from '@/core/auth/authStore'
import { useDepartments, useAllTeams, useProjects, useMemberships, useReportSummary, useTimeEntriesOrg } from '@/core/api/hooks'
import { useDashboardStats } from '@/modules/dashboard/data/useDashboardStats'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { StatCard } from '@/shared/components/charts/StatCard'
import { ChartCard } from '@/shared/components/charts/ChartCard'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Separator } from '@/shared/components/ui/Separator'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { Button } from '@/shared/components/ui/Button'
import type { UUID } from '@/core/api/types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function weekRange() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { from: monday.toISOString(), to: sunday.toISOString() }
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { adminStats, isLoading } = useDashboardStats()
  const { data: departments = [] } = useDepartments(orgId as UUID)
  const { data: projects = [] } = useProjects(orgId as UUID)
  const { data: members = [] } = useMemberships(orgId as UUID)
  const deptIds = useMemo(() => departments.map((d) => d.id as UUID), [departments])
  const teamQueries = useAllTeams(deptIds)
  const { data: report } = useReportSummary({})
  const { from, to } = weekRange()
  const { data: orgEntries = [] } = useTimeEntriesOrg({ from, to })

  const totalTeams = useMemo(() => teamQueries.reduce((sum, q) => sum + (q.data?.length ?? 0), 0), [teamQueries])
  const activeProjects = projects.filter((p) => p.isActive).length

  const memberHours = useMemo(() => (report?.memberProductivity ?? []).map((m) => ({ name: m.name, hours: m.hours })), [report])

  const departmentHours = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of orgEntries) {
      if (!entry.projectId) continue
      const project = projects.find((p) => p.id === entry.projectId)
      if (!project) continue
      const dept = departments.find((d) => d.id === project.departmentId)
      const name = dept?.name ?? 'Sem departamento'
      const hours = entry.durationSeconds ? entry.durationSeconds / 3600 : 0
      map.set(name, (map.get(name) ?? 0) + hours)
    }
    return Array.from(map.entries())
      .map(([department, h]) => ({ department, hours: Math.round(h * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
  }, [orgEntries, projects, departments])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <PageHeader title="Administrador" description="Visão geral da organização" />

      <motion.div
        className="grid grid-cols-2 gap-4 sm:grid-cols-5"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <StatCard value={members.length} label="Membros" icon={Users} formatValue={(v) => String(v)} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={projects.length} label="Projetos" icon={FolderKanban} formatValue={(v) => String(v)} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={departments.length} label="Departamentos" icon={Building2} formatValue={(v) => String(v)} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={totalTeams} label="Equipes" icon={Users2} formatValue={(v) => String(v)} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={activeProjects}
            label="Projetos Ativos"
            icon={Target}
            formatValue={(v) => String(v)}
            trend="up"
            trendValue={projects.length > 0 ? `${Math.round((activeProjects / projects.length) * 100)}%` : '0%'}
          />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <ChartCard title="Horas por Membro" subtitle="Top contribuidores">
            <div className="h-72">
              {memberHours.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sem horas registradas nesta semana.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberHours} layout="vertical" margin={{ left: 80, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} axisLine={false} tickLine={false} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 13 }}
                      formatter={(value: number) => [`${value}h`, 'Horas']}
                    />
                    <Bar dataKey="hours" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ChartCard title="Horas por Departamento" subtitle="Distribuição de carga">
            <div className="h-72">
              {departmentHours.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sem horas registradas nesta semana.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="department" stroke="var(--muted-foreground)" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 13 }}
                      formatter={(value: number) => [`${value}h`, 'Horas']}
                    />
                    <Bar dataKey="hours" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex items-center justify-between p-6 pb-3">
            <div>
              <h3 className="text-base font-medium text-foreground">Acesso Rápido</h3>
              <p className="text-sm text-muted-foreground">
                Gerencie recursos da organização
              </p>
            </div>
          </div>
          <Separator />
          <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <Button variant="outline" className="h-auto justify-between gap-4 py-4" onClick={() => navigate(ROUTES.ADMIN.MEMBERS)}>
              <div className="flex items-center gap-3">
                <Users className="size-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Membros</p>
                  <p className="text-xs text-muted-foreground">{members.length} membros</p>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Button>
            <Button variant="outline" className="h-auto justify-between gap-4 py-4" onClick={() => navigate(ROUTES.ADMIN.PROJECTS)}>
              <div className="flex items-center gap-3">
                <FolderKanban className="size-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Projetos</p>
                  <p className="text-xs text-muted-foreground">{projects.length} projetos</p>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Button>
            <Button variant="outline" className="h-auto justify-between gap-4 py-4" onClick={() => navigate(ROUTES.ADMIN.DEPARTMENTS)}>
              <div className="flex items-center gap-3">
                <Building2 className="size-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Departamentos</p>
                  <p className="text-xs text-muted-foreground">{departments.length} deptos.</p>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Button>
            <Button variant="outline" className="h-auto justify-between gap-4 py-4" onClick={() => navigate(ROUTES.ADMIN.TEAMS)}>
              <div className="flex items-center gap-3">
                <Users2 className="size-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Equipes</p>
                  <p className="text-xs text-muted-foreground">{totalTeams} equipes</p>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Button>
            <Button variant="outline" className="h-auto justify-between gap-4 py-4" onClick={() => navigate(ROUTES.ADMIN.LABELS)}>
              <div className="flex items-center gap-3">
                <FolderKanban className="size-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Etiquetas</p>
                  <p className="text-xs text-muted-foreground">Gerenciar categorias</p>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
