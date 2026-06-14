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
  LineChart,
  Line,
} from 'recharts'
import { Clock, BarChart3, Users, Tag, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { StatCard } from '@/shared/components/charts/StatCard'
import { ChartCard } from '@/shared/components/charts/ChartCard'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/Tabs'
import { demoReportData } from '@/modules/reports/data/reports.mock'

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899']

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

export default function ReportsPage() {
  const [chartView, setChartView] = useState<'hours' | 'activities'>('hours')
  const data = demoReportData

  const totalHours = useMemo(
    () => data.projectHours.reduce((sum, p) => sum + p.hours, 0),
    [data],
  )

  const totalActivities = useMemo(
    () => data.memberProductivity.reduce((sum, m) => sum + m.activities, 0),
    [data],
  )

  const topMember = useMemo(
    () => data.memberProductivity.reduce((best, m) => (m.hours > best.hours ? m : best)),
    [data],
  )

  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <PageHeader title="Relatórios" description="Análise de horas, produtividade e distribuição" />

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <StatCard
            value={totalHours}
            label="Total de Horas"
            icon={Clock}
            formatValue={(v) => `${v.toFixed(1)}h`}
            trend="up"
            trendValue={`+${data.dailyAverage.toFixed(1)}h/dia`}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={data.dailyAverage}
            label="Média Diária"
            icon={TrendingUp}
            formatValue={(v) => `${v.toFixed(1)}h`}
            trend="up"
            trendValue="Meta: 8h"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={totalActivities}
            label="Atividades"
            icon={BarChart3}
            formatValue={(v) => String(v)}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={topMember.hours}
            label="Maior Contribuidor"
            icon={Users}
            formatValue={(v) => `${v.toFixed(1)}h`}
            trend="up"
            trendValue={topMember.name.split(' ')[0]}
          />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <ChartCard title="Horas da Semana" subtitle="Distribuição diária">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weeklyHours}>
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
                    formatter={(value: number) => [`${value}h`, 'Horas']}
                  />
                  <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ChartCard title="Horas por Projeto" subtitle="Distribuição percentual">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.projectHours}
                    cx="50%"
                    cy="45%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="hours"
                    nameKey="project"
                    stroke="none"
                  >
                    {data.projectHours.map((entry) => (
                      <Cell key={entry.project} fill={entry.color} />
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
                    formatter={(value: number) => [`${value}h`, 'Horas']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {data.projectHours.map((entry) => (
                  <div key={entry.project} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground">{entry.project}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <ChartCard title="Produtividade por Membro" subtitle="Horas e atividades">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.memberProductivity}
                  layout="vertical"
                  margin={{ left: 80, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--popover-foreground)',
                      fontSize: '13px',
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'hours' ? `${value}h` : value,
                      name === 'hours' ? 'Horas' : 'Atividades',
                    ]}
                  />
                  <Bar dataKey="hours" fill="#3B82F6" radius={[0, 4, 4, 0]} name="hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ChartCard title="Distribuição por Label" subtitle="Atividades por categoria">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.labelDistribution}
                    cx="50%"
                    cy="45%"
                    outerRadius={82}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="label"
                    stroke="none"
                  >
                    {data.labelDistribution.map((entry, i) => (
                      <Cell key={entry.label} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
                    formatter={(value: number) => [value, 'Atividades']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {data.labelDistribution.map((entry, i) => (
                  <div key={entry.label} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{entry.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <ChartCard title="Produtividade - Horas por Membro" subtitle="Ranking de contribuição">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pl-2 font-medium">Membro</th>
                  <th className="pb-3 font-medium">Horas</th>
                  <th className="pb-3 font-medium">Atividades</th>
                  <th className="pb-3 pr-2 font-medium">Média h/dia</th>
                </tr>
              </thead>
              <tbody>
                {data.memberProductivity.map((member, i) => {
                  const daysWorked = 5
                  const dailyAvg = member.hours / daysWorked
                  return (
                    <tr
                      key={member.name}
                      className="border-b border-border/50 transition-colors hover:bg-muted/20"
                    >
                      <td className="flex items-center gap-3 py-3 pl-2">
                        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                          {i + 1}
                        </span>
                        <span className="font-medium text-foreground">{member.name}</span>
                      </td>
                      <td className="py-3 tabular-nums text-foreground">{member.hours.toFixed(1)}h</td>
                      <td className="py-3">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {member.activities} atv.
                        </Badge>
                      </td>
                      <td className="py-3 pr-2 tabular-nums text-foreground">
                        {dailyAvg.toFixed(1)}h
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </motion.div>
    </motion.div>
  )
}
