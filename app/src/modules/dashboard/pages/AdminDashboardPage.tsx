import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Users,
  FolderKanban,
  Building2,
  Layers,
  Clock,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { ROUTES } from '@/core/config/routes'
import { useAuthStore } from '@/core/auth/authStore'
import { canViewAdmin } from '@/core/auth/permissions'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { StatCard } from '@/shared/components/charts/StatCard'
import { ChartCard } from '@/shared/components/charts/ChartCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Progress } from '@/shared/components/ui/Progress'

import { demoDashboardStats, demoAdminStats } from '@/modules/dashboard/data/dashboard.mock'

const chartColors = {
  violet: '#8b5cf6',
  sky: '#0ea5e9',
  emerald: '#10b981',
  amber: '#f59e0b',
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const activeOrg = useAuthStore((s) => s.activeOrg)

  useEffect(() => {
    if (activeOrg && !canViewAdmin(activeOrg.role)) {
      navigate(ROUTES.DASHBOARD, { replace: true })
    }
  }, [activeOrg, navigate])

  if (activeOrg && !canViewAdmin(activeOrg.role)) {
    return null
  }

  const adminStats = demoAdminStats
  const userStats = demoDashboardStats

  const maxMemberHours = Math.max(...adminStats.memberHours.map((m) => m.hours), 1)

  return (
    <motion.div
      className="flex flex-col gap-6"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
      }}
    >
      <PageHeader title="Admin Dashboard" description="Visão geral da organização" />

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
        }}
      >
        <motion.div variants={itemVariants}>
          <StatCard
            value={adminStats.totalMembers}
            label="Membros"
            icon={Users}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={adminStats.activeProjects}
            label="Projetos Ativos"
            icon={FolderKanban}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={adminStats.totalDepartments}
            label="Departamentos"
            icon={Building2}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={adminStats.totalTeams}
            label="Equipas"
            icon={Layers}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={adminStats.totalHoursOrg}
            label="Horas Totais"
            icon={Clock}
            formatValue={(v) => `${v.toFixed(1)}h`}
          />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <motion.div
          className="lg:col-span-3"
          variants={itemVariants}
        >
          <ChartCard title="Horas por Departamento" subtitle="Total de horas registadas">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adminStats.departmentHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="department"
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
                  <Bar
                    dataKey="hours"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  >
                    {adminStats.departmentHours.map((entry, index) => (
                      <Cell
                        key={entry.department}
                        fill={[chartColors.violet, chartColors.sky, chartColors.emerald][index % 3]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </motion.div>

        <motion.div
          className="lg:col-span-2"
          variants={itemVariants}
        >
          <ChartCard title="Top Membros" subtitle="Por horas registadas">
            <div className="flex flex-col gap-3 pt-1">
              {adminStats.memberHours.map((member) => {
                const percentage = (member.hours / maxMemberHours) * 100
                const barColor =
                  percentage >= 90
                    ? chartColors.emerald
                    : percentage >= 60
                      ? chartColors.sky
                      : percentage >= 30
                        ? chartColors.amber
                        : chartColors.violet
                return (
                  <div key={member.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{member.name}</span>
                      <span className="text-muted-foreground">{member.hours}h</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </ChartCard>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">
              Taxa de Conclusão de Atividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Geral</span>
                  <span className="font-medium text-foreground">{userStats.completionRate}%</span>
                </div>
                <Progress value={userStats.completionRate} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Alta prioridade</span>
                  <span className="font-medium text-foreground">85%</span>
                </div>
                <Progress value={85} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Média prioridade</span>
                  <span className="font-medium text-foreground">68%</span>
                </div>
                <Progress value={68} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Baixa prioridade</span>
                  <span className="font-medium text-foreground">92%</span>
                </div>
                <Progress value={92} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
