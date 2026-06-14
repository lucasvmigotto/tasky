import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Clock, CalendarDays, ListChecks, Target, ArrowRight, Send, Loader2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { ROUTES } from '@/core/config/routes'
import { useAuthStore } from '@/core/auth/authStore'
import { useDashboardStats } from '@/modules/dashboard/data/useDashboardStats'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { StatCard } from '@/shared/components/charts/StatCard'
import { ChartCard } from '@/shared/components/charts/ChartCard'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { Separator } from '@/shared/components/ui/Separator'

const chartColors = {
  violet: '#8b5cf6',
  sky: '#0ea5e9',
  emerald: '#10b981',
  amber: '#f59e0b',
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { stats, isLoading } = useDashboardStats()
  const [quickText, setQuickText] = useState('')

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  const handleQuickSubmit = useCallback(() => {
    if (!quickText.trim()) return
    navigate(ROUTES.TIMESHEET)
  }, [quickText, navigate])

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
      <PageHeader title="Dashboard" description={`${greeting}, ${user?.displayName ?? 'user'}`} />

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">What are you working on today?</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Type and press Enter to log to Timesheet</p>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[320px]">
                <Input
                  placeholder="Ex: Dashboard development..."
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickSubmit()}
                  className="flex-1 border-border/50 bg-muted/30 text-sm focus:border-primary/50"
                />
                <Button size="icon" className="size-10 shrink-0" onClick={handleQuickSubmit} disabled={!quickText.trim()}>
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={containerVariants}>
        <motion.div variants={itemVariants}>
          <StatCard value={stats.totalHoursToday} label="Today" icon={Clock} formatValue={(v) => `${v.toFixed(1)}h`} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={stats.totalHoursWeek} label="Week" icon={CalendarDays} formatValue={(v) => `${v.toFixed(1)}h`} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={stats.totalActivitiesWeek} label="Activities" icon={ListChecks} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard value={stats.projectDistribution.length} label="Projects" icon={Target} />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <ChartCard title="Weekly Hours" subtitle="Hours tracked per day">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats.weeklyChartData}>
                <defs>
                  <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }} />
                <Area type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={2} fill="url(#hoursGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ChartCard title="Projects" subtitle="Hours per project">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={stats.projectDistribution} dataKey="hours" nameKey="projectName" cx="50%" cy="50%" outerRadius={80} label={({ projectName, percent }) => `${(percent * 100).toFixed(0)}%`}>
                  {stats.projectDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium">Recent Activities</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.ACTIVITIES)}>
                View all <ArrowRight className="ml-1 size-3.5" />
              </Button>
            </div>
            {stats.recentActivities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No activities this week</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{act.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(act.startDatetime).toLocaleString()}</p>
                    </div>
                    <Badge variant="secondary">{((new Date(act.endDatetime).getTime() - new Date(act.startDatetime).getTime()) / 3600000).toFixed(1)}h</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
