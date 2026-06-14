import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Users, FolderKanban, Building2, Layers, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { ROUTES } from '@/core/config/routes'
import { useAuthStore } from '@/core/auth/authStore'
import { canViewAdmin } from '@/core/auth/permissions'
import { useDashboardStats } from '@/modules/dashboard/data/useDashboardStats'
import { useDepartments } from '@/core/api/hooks'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { StatCard } from '@/shared/components/charts/StatCard'
import { ChartCard } from '@/shared/components/charts/ChartCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Progress } from '@/shared/components/ui/Progress'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import type { UUID } from '@/core/api/types'

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.08 } },
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null
  const { adminStats, stats, isLoading } = useDashboardStats()
  const { data: departments } = useDepartments(orgId as UUID)

  useEffect(() => {
    if (!canViewAdmin(role)) navigate(ROUTES.DASHBOARD, { replace: true })
  }, [role, navigate])

  const quickAccessCards = [
    { label: 'Members', value: adminStats.totalMembers, icon: Users, href: ROUTES.ADMIN.MEMBERS, color: 'bg-violet-500/10 text-violet-400' },
    { label: 'Projects', value: adminStats.totalProjects, icon: FolderKanban, href: ROUTES.ADMIN.PROJECTS, color: 'bg-sky-500/10 text-sky-400' },
    { label: 'Departments', value: departments?.length ?? 0, icon: Building2, href: ROUTES.ADMIN.DEPARTMENTS, color: 'bg-emerald-500/10 text-emerald-400' },
    { label: 'Active Projects', value: adminStats.activeProjects, icon: Layers, href: ROUTES.ADMIN.PROJECTS, color: 'bg-amber-500/10 text-amber-400' },
  ]

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader title="Admin Dashboard" description="Organization overview" />

      <motion.div className="grid grid-cols-2 gap-4 sm:grid-cols-4" variants={containerVariants}>
        {quickAccessCards.map((card) => (
          <motion.div key={card.label} variants={itemVariants}>
            <Card
              className="cursor-pointer transition-all hover:border-primary/30"
              onClick={() => navigate(card.href)}
            >
              <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
                <div className={`rounded-lg p-2.5 ${card.color}`}>
                  <card.icon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Weekly Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {stats.weeklyChartData.map((_, i) => (
                      <Cell key={i} fill={[chartColors.violet, chartColors.sky, chartColors.emerald, chartColors.amber, chartColors.violet, chartColors.sky, chartColors.emerald][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Project Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.projectDistribution.slice(0, 5).map((proj, i) => (
                  <div key={i}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{proj.projectName}</span>
                      <span className="text-muted-foreground">{proj.hours.toFixed(1)}h</span>
                    </div>
                    <Progress value={Math.min((proj.hours / (stats.totalHoursWeek || 1)) * 100, 100)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
