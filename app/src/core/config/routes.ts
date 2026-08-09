export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  MY_WORK: '/my-work',
  MY_SECTOR: '/my-sector',
  DASHBOARD: '/dashboard',
  REQUESTS: '/requests',
  REQUEST_DETAIL: '/requests/:requestId',
  TIMESHEET: '/timesheet',
  TIMESHEET_APPROVALS: '/timesheet/approvals',
  TIME_TRACKER: '/time-tracker',
  PROJECTS: '/projects',
  PROJECT_DETAIL: '/projects/:projectId',
  ACTIVITIES: '/activities',
  ACTIVITY_DETAIL: '/activities/:activityId',
  TIMELINE: '/timeline',
  CALENDAR: '/calendar',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  ADMIN: {
    DASHBOARD: '/admin',
    MEMBERS: '/admin/members',
    DEPARTMENTS: '/admin/departments',
    PROJECTS: '/admin/projects',
  },
} as const

export function buildRoute(route: string, params: Record<string, string>) {
  let result = route
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, value)
  }
  return result
}
