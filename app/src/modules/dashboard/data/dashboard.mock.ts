import { demoActivities } from '@/modules/activities/data/activities.mock'

function getWeekdayDates(): string[] {
  const days: string[] = []
  const now = new Date()
  const currentDay = now.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay

  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + mondayOffset + i)
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
    const dayIndex = d.getDay()
    days.push(`${dayNames[dayIndex]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return days
}

const weekDays = getWeekdayDates()

export interface WeeklyChartPoint {
  day: string
  hours: number
  activities: number
}

export interface ProjectDistribution {
  projectName: string
  hours: number
  color: string
}

export interface DashboardStats {
  totalHoursToday: number
  totalHoursWeek: number
  totalActivitiesWeek: number
  completionRate: number
  weeklyChartData: WeeklyChartPoint[]
  projectDistribution: ProjectDistribution[]
  recentActivities: typeof demoActivities
}

export interface AdminStats {
  totalMembers: number
  totalProjects: number
  totalDepartments: number
  totalTeams: number
  activeProjects: number
  totalHoursOrg: number
  memberHours: Array<{ name: string; hours: number }>
  departmentHours: Array<{ department: string; hours: number }>
}

export const demoDashboardStats: DashboardStats = {
  totalHoursToday: 5.5,
  totalHoursWeek: 32.5,
  totalActivitiesWeek: 18,
  completionRate: 72,
  weeklyChartData: [
    { day: weekDays[0], hours: 6, activities: 4 },
    { day: weekDays[1], hours: 8, activities: 5 },
    { day: weekDays[2], hours: 7.5, activities: 3 },
    { day: weekDays[3], hours: 6.5, activities: 4 },
    { day: weekDays[4], hours: 4.5, activities: 2 },
    { day: weekDays[5], hours: 0, activities: 0 },
    { day: weekDays[6], hours: 0, activities: 0 },
  ],
  projectDistribution: [
    { projectName: 'TaskY Web App', hours: 16.5, color: '#3B82F6' },
    { projectName: 'TaskY Mobile', hours: 7, color: '#10B981' },
    { projectName: 'Design System', hours: 4.5, color: '#F59E0B' },
    { projectName: 'Landing Pages', hours: 3.5, color: '#8B5CF6' },
    { projectName: 'Legacy Migration', hours: 1, color: '#EF4444' },
  ],
  recentActivities: demoActivities.slice(0, 5),
}

export const demoAdminStats: AdminStats = {
  totalMembers: 8,
  totalProjects: 5,
  totalDepartments: 3,
  totalTeams: 6,
  activeProjects: 4,
  totalHoursOrg: 142.5,
  memberHours: [
    { name: 'Ana Silva', hours: 28 },
    { name: 'Carlos Mendes', hours: 25.5 },
    { name: 'Rafael Oliveira', hours: 22 },
    { name: 'Marina Lima', hours: 18.5 },
    { name: 'Pedro Almeida', hours: 16 },
  ],
  departmentHours: [
    { department: 'Engineering', hours: 82 },
    { department: 'Design', hours: 35.5 },
    { department: 'Marketing', hours: 25 },
  ],
}
