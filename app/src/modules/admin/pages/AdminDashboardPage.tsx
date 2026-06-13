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
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { StatCard } from '@/shared/components/charts/StatCard'
import { ChartCard } from '@/shared/components/charts/ChartCard'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Separator } from '@/shared/components/ui/Separator'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { demoAdminStats } from '@/modules/dashboard/data/dashboard.mock'

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

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.activeOrg?.role)
  const stats = demoAdminStats

  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <PageHeader title="Administrador" description="Visão geral da organização" />

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <StatCard
            value={stats.totalMembers}
            label="Membros"
            icon={Users}
            formatValue={(v) => String(v)}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={stats.totalProjects}
            label="Projetos"
            icon={FolderKanban}
            formatValue={(v) => String(v)}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={stats.totalDepartments}
            label="Departamentos"
            icon={Building2}
            formatValue={(v) => String(v)}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={stats.totalTeams}
            label="Equipes"
            icon={Users2}
            formatValue={(v) => String(v)}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            value={stats.activeProjects}
            label="Projetos Ativos"
            icon={Target}
            formatValue={(v) => String(v)}
            trend="up"
            trendValue={`${Math.round((stats.activeProjects / stats.totalProjects) * 100)}%`}
          />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <ChartCard title="Horas por Membro" subtitle="Top contribuidores">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.memberHours}
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
                    formatter={(value: number) => [`${value}h`, 'Horas']}
                  />
                  <Bar dataKey="hours" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ChartCard title="Horas por Departamento" subtitle="Distribuição de carga">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.departmentHours}>
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
                  <Bar dataKey="hours" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
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
            <Button
              variant="outline"
              className="h-auto justify-between gap-4 py-4"
              onClick={() => navigate(ROUTES.ADMIN.MEMBERS)}
            >
              <div className="flex items-center gap-3">
                <Users className="size-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Membros</p>
                  <p className="text-xs text-muted-foreground">{stats.totalMembers} membros</p>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-between gap-4 py-4"
              onClick={() => navigate(ROUTES.ADMIN.PROJECTS)}
            >
              <div className="flex items-center gap-3">
                <FolderKanban className="size-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Projetos</p>
                  <p className="text-xs text-muted-foreground">{stats.totalProjects} projetos</p>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-between gap-4 py-4"
              onClick={() => navigate(ROUTES.ADMIN.DEPARTMENTS)}
            >
              <div className="flex items-center gap-3">
                <Building2 className="size-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Departamentos</p>
                  <p className="text-xs text-muted-foreground">{stats.totalDepartments} deptos.</p>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-between gap-4 py-4"
              onClick={() => navigate(ROUTES.ADMIN.TEAMS)}
            >
              <div className="flex items-center gap-3">
                <Users2 className="size-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Equipes</p>
                  <p className="text-xs text-muted-foreground">{stats.totalTeams} equipes</p>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-between gap-4 py-4"
              onClick={() => navigate(ROUTES.ADMIN.LABELS)}
            >
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
