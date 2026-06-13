export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  TIMESHEET: '/timesheet',
  PROJECTS: '/projects',
  PROJECT_DETAIL: '/projects/:projectId',
  ACTIVITIES: '/activities',
  ACTIVITY_DETAIL: '/activities/:activityId',
  CALENDAR: '/calendar',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  ADMIN: {
    DASHBOARD: '/admin',
    MEMBERS: '/admin/members',
    DEPARTMENTS: '/admin/departments',
    TEAMS: '/admin/teams',
    PROJECTS: '/admin/projects',
    LABELS: '/admin/labels',
  },
} as const

export function buildRoute(route: string, params: Record<string, string>) {
  let result = route
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, value)
  }
  return result
}
