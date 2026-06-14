import { useMemo } from 'react'
import { useProjects, useActivityQuery, useMemberships } from '@/core/api/hooks'
import { useAuthStore } from '@/core/auth/authStore'
import type { UUID } from '@/core/api/types'

export interface DashboardStats {
  totalHoursToday: number
  totalHoursWeek: number
  totalActivitiesWeek: number
  weeklyChartData: Array<{ day: string; hours: number; activities: number }>
  projectDistribution: Array<{ projectName: string; hours: number; color: string }>
  recentActivities: Array<{ id: string; title: string; projectId: string; startDatetime: string; endDatetime: string }>
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4']

function getWeekDates(): { weekStart: Date; weekEnd: Date; dayLabels: string[] } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const labels: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    labels.push(`${dayLabels[d.getDay()]} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`)
  }

  return { weekStart: monday, weekEnd: sunday, dayLabels: labels }
}

export function useDashboardStats() {
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const user = useAuthStore((s) => s.user)
  const orgId = activeOrg?.id ?? null
  const { weekStart, weekEnd, dayLabels } = getWeekDates()

  const { data: projects } = useProjects(orgId as UUID)
  const { data: members } = useMemberships(orgId as UUID)
  const todayStr = new Date().toISOString().split('T')[0]
  const weekStartStr = weekStart.toISOString()
  const weekEndStr = weekEnd.toISOString()

  const { data: weekActivities } = useActivityQuery(
    orgId ? { from: weekStartStr, to: weekEndStr } : null
  )
  const { data: todayActivities } = useActivityQuery(
    orgId ? { from: `${todayStr}T00:00:00.000Z`, to: `${todayStr}T23:59:59.999Z` } : null
  )

  const stats: DashboardStats = useMemo(() => {
    const weekActs = weekActivities ?? []
    const todayActs = todayActivities ?? []

    const totalHoursToday = todayActs.reduce((sum, a) => {
      const start = new Date(a.startDatetime).getTime()
      const end = new Date(a.endDatetime).getTime()
      return sum + (end - start) / 3600000
    }, 0)

    const totalHoursWeek = weekActs.reduce((sum, a) => {
      const start = new Date(a.startDatetime).getTime()
      const end = new Date(a.endDatetime).getTime()
      return sum + (end - start) / 3600000
    }, 0)

    const weekChartData = dayLabels.map((day, i) => {
      const dayStart = new Date(weekStart)
      dayStart.setDate(weekStart.getDate() + i)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const dayActs = weekActs.filter((a) => {
        const s = new Date(a.startDatetime)
        return s >= dayStart && s <= dayEnd
      })

      const hours = dayActs.reduce((sum, a) => {
        const start = new Date(a.startDatetime).getTime()
        const end = new Date(a.endDatetime).getTime()
        return sum + (end - start) / 3600000
      }, 0)

      return { day, hours: Math.round(hours * 10) / 10, activities: dayActs.length }
    })

    const projectMap = new Map<string, number>()
    weekActs.forEach((a) => {
      const hours = (new Date(a.endDatetime).getTime() - new Date(a.startDatetime).getTime()) / 3600000
      projectMap.set(a.projectId, (projectMap.get(a.projectId) ?? 0) + hours)
    })
    const projectDistribution = Array.from(projectMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([projectId, hours], i) => ({
        projectName: projects?.find((p) => p.id === projectId)?.name ?? projectId,
        hours: Math.round(hours * 10) / 10,
        color: COLORS[i % COLORS.length],
      }))

    return {
      totalHoursToday: Math.round(totalHoursToday * 10) / 10,
      totalHoursWeek: Math.round(totalHoursWeek * 10) / 10,
      totalActivitiesWeek: weekActs.length,
      weeklyChartData: weekChartData,
      projectDistribution,
      recentActivities: weekActs
        .sort((a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime())
        .slice(0, 5)
        .map((a) => ({ id: a.id, title: a.title, projectId: a.projectId, startDatetime: a.startDatetime, endDatetime: a.endDatetime })),
    }
  }, [weekActivities, todayActivities, projects, dayLabels, weekStart])

  const adminStats = useMemo(() => ({
    totalMembers: members?.length ?? 0,
    totalProjects: projects?.length ?? 0,
    totalHoursOrg: stats.totalHoursWeek,
    activeProjects: projects?.filter((p) => p.isActive).length ?? 0,
  }), [members, projects, stats.totalHoursWeek])

  return { stats, adminStats, isLoading: !weekActivities || !todayActivities }
}
