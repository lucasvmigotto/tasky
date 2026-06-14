function getWeekdayLabels(): string[] {
  const days: string[] = []
  const now = new Date()
  const currentDay = now.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay

  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + mondayOffset + i)
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
    const dayIndex = d.getDay()
    days.push(`${dayNames[dayIndex]}`)
  }
  return days
}

const weekLabels = getWeekdayLabels()

export interface WeeklyHoursPoint {
  day: string
  hours: number
}

export interface ProjectHoursPoint {
  project: string
  hours: number
  color: string
}

export interface MemberProductivityPoint {
  name: string
  hours: number
  activities: number
}

export interface LabelDistributionPoint {
  label: string
  count: number
}

export interface ReportData {
  weeklyHours: WeeklyHoursPoint[]
  projectHours: ProjectHoursPoint[]
  memberProductivity: MemberProductivityPoint[]
  labelDistribution: LabelDistributionPoint[]
  dailyAverage: number
}

export const demoReportData: ReportData = {
  weeklyHours: [
    { day: weekLabels[0], hours: 6 },
    { day: weekLabels[1], hours: 8 },
    { day: weekLabels[2], hours: 7.5 },
    { day: weekLabels[3], hours: 6.5 },
    { day: weekLabels[4], hours: 4.5 },
    { day: weekLabels[5], hours: 0 },
    { day: weekLabels[6], hours: 0 },
  ],
  projectHours: [
    { project: 'TaskY Web App', hours: 38, color: '#3B82F6' },
    { project: 'TaskY Mobile', hours: 18.5, color: '#10B981' },
    { project: 'Design System', hours: 12, color: '#F59E0B' },
    { project: 'Landing Pages', hours: 8.5, color: '#8B5CF6' },
    { project: 'Legacy Migration', hours: 2, color: '#EF4444' },
  ],
  memberProductivity: [
    { name: 'Ana Silva', hours: 28, activities: 6 },
    { name: 'Carlos Mendes', hours: 25.5, activities: 5 },
    { name: 'Juliana Costa', hours: 23, activities: 4 },
    { name: 'Rafael Oliveira', hours: 22, activities: 5 },
    { name: 'Beatriz Santos', hours: 20, activities: 4 },
    { name: 'Pedro Almeida', hours: 16, activities: 3 },
    { name: 'Marina Lima', hours: 18.5, activities: 4 },
    { name: 'Lucas Ferreira', hours: 9.5, activities: 2 },
  ],
  labelDistribution: [
    { label: 'Funcionalidade', count: 8 },
    { label: 'Correcao', count: 4 },
    { label: 'Rotina', count: 5 },
    { label: 'Melhoria', count: 3 },
    { label: 'Ideia', count: 2 },
    { label: 'Urgente', count: 1 },
    { label: 'Bug', count: 3 },
    { label: 'Documentacao', count: 2 },
  ],
  dailyAverage: 6.5,
}
