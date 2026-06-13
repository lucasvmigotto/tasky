import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Clock, CalendarDays, ListChecks, Target, ArrowRight, Send } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { ROUTES } from '@/core/config/routes'
import { useAuthStore } from '@/core/auth/authStore'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { StatCard } from '@/shared/components/charts/StatCard'
import { ChartCard } from '@/shared/components/charts/ChartCard'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Separator } from '@/shared/components/ui/Separator'
import { demoDashboardStats } from '@/modules/dashboard/data/dashboard.mock'

const chartColors = {
  violet: '#8b5cf6',
  sky: '#0ea5e9',
  emerald: '#10b981',
  amber: '#f59e0b',
}

function getProjectName(projectId: string): string {
  const map: Record<string, string> = {
    'proj-001': 'TaskY Web App',
    'proj-002': 'TaskY Mobile',
    'proj-003': 'Design System',
    'proj-004': 'Landing Pages',
    'proj-005': 'Legacy Migration',
  }
  return map[projectId] ?? projectId
}

function getWeightVariant(weight: number): 'success' | 'warning' | 'destructive' | 'info' {
  if (weight <= 3) return 'success'
  if (weight <= 5) return 'warning'
  if (weight <= 8) return 'destructive'
  return 'info'
}

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

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const stats = demoDashboardStats
  const [quickText, setQuickText] = useState('')

  const now = new Date()
  const greeting =
    now.getHours() < 12
      ? 'Bom dia'
      : now.getHours() < 18
        ? 'Boa tarde'
        : 'Boa noite'

  const handleQuickSubmit = useCallback(() => {
    if (!quickText.trim()) return
    navigate(ROUTES.TIMESHEET)
  }, [quickText, navigate])

  const handleQuickKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuickSubmit()
    }
  }, [handleQuickSubmit])

  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <PageHeader
        title="Painel"
        description={`${greeting}, ${user?.displayName ?? 'usuário'}`}
      />

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">
                  No que você está trabalhando hoje?
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Digite e tecle Enter para registrar na Planilha de Horas
                </p>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[320px]">
                <Input
                  placeholder="Ex: Desenvolvimento dashboard..."
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  onKeyDown={handleQuickKeyDown}
                  className="flex-1 border-border/50 bg-muted/30 text-sm focus:border-primary/50"
                />
                <Button
                  size="icon"
                  className="size-10 shrink-0"
                  onClick={handleQuickSubmit}
                  disabled={!quickText.trim()}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <StatCard
            value={stats.totalHoursToday}
            label="Hoje"
            icon={Clock}
            formatValue={(v) => `${v.toFixed(1)}h`}
            trend="up"
            trendValue="+0.5h"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={stats.totalHoursWeek}
            label="Semana"
            icon={CalendarDays}
            formatValue={(v) => `${v.toFixed(1)}h`}
            trend="up"
            trendValue="+2h"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={stats.totalActivitiesWeek}
            label="Atividades"
            icon={ListChecks}
            formatValue={(v) => String(v)}
            trend="up"
            trendValue="+3"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={stats.completionRate}
            label="Conclusão"
            icon={Target}
            formatValue={(v) => `${Math.round(v)}%`}
            trend="up"
            trendValue="+5%"
          />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-7">
        <motion.div
          className="lg:col-span-2 xl:col-span-4"
          variants={itemVariants}
        >
          <ChartCard title="Horas e Atividades da Semana" subtitle="Distribuição diária">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.weeklyChartData}>
                  <defs>
                    <linearGradient id="gradHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.violet} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={chartColors.violet} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradActivities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.sky} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={chartColors.sky} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="day"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickMargin={8}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickMargin={8}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--popover-foreground)',
                      fontSize: '13px',
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke={chartColors.violet}
                    strokeWidth={2}
                    fill="url(#gradHours)"
                    name="Horas"
                  />
                  <Area
                    type="monotone"
                    dataKey="activities"
                    stroke={chartColors.sky}
                    strokeWidth={2}
                    fill="url(#gradActivities)"
                    name="Atividades"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </motion.div>

        <motion.div
          className="lg:col-span-1 xl:col-span-3"
          variants={itemVariants}
        >
          <ChartCard title="Distribuição por Projeto" subtitle="Horas alocadas">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.projectDistribution}
                    cx="50%"
                    cy="45%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="hours"
                    nameKey="projectName"
                    stroke="none"
                  >
                    {stats.projectDistribution.map((entry) => (
                      <Cell key={entry.projectName} fill={entry.color} />
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
                    formatter={(_: number, name: string) => [`${_}h`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {stats.projectDistribution.map((entry) => (
                  <div key={entry.projectName} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground">{entry.projectName}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex items-center justify-between p-6 pb-3">
            <div>
              <h3 className="text-base font-medium text-foreground">Atividades Recentes</h3>
              <p className="text-sm text-muted-foreground">
                Últimas 5 atividades registradas
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.ACTIVITIES)}
            >
              Ver todas
              <ArrowRight className="ml-1 size-3.5" />
            </Button>
          </div>
          <Separator />
          <CardContent className="p-0">
            {stats.recentActivities.map((activity, index) => (
              <div key={activity.id}>
                {index > 0 && <Separator />}
                <div className="flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {getProjectName(activity.projectId)}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(activity.startDatetime).toLocaleDateString('pt-BR')}
                    </span>
                    <Badge variant={getWeightVariant(activity.weight)} className="text-xs">
                      {activity.weight}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
