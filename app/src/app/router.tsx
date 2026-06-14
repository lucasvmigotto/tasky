import { Suspense, lazy } from 'react'
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/core/auth/authStore'
import { ROUTES } from '@/core/config/routes'
import DashboardLayout from '@/app/layouts/DashboardLayout'
import LoadingPage from '@/shared/components/feedback/LoadingPage'

const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/modules/dashboard/pages/DashboardPage'))
const TimesheetPage = lazy(() => import('@/modules/timesheet/pages/TimesheetPage'))
const ProjectsPage = lazy(() => import('@/modules/projects/pages/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('@/modules/projects/pages/ProjectDetailPage'))
const ActivitiesPage = lazy(() => import('@/modules/activities/pages/ActivitiesPage'))
const ActivityDetailPage = lazy(() => import('@/modules/activities/pages/ActivityDetailPage'))
const CalendarPage = lazy(() => import('@/modules/calendar/pages/CalendarPage'))
const ReportsPage = lazy(() => import('@/modules/reports/pages/ReportsPage'))
const SettingsPage = lazy(() => import('@/modules/settings/pages/SettingsPage'))
const AdminDashboardPage = lazy(() => import('@/modules/admin/pages/AdminDashboardPage'))
const AdminMembersPage = lazy(() => import('@/modules/admin/pages/AdminMembersPage'))
const AdminDepartmentsPage = lazy(() => import('@/modules/admin/pages/AdminDepartmentsPage'))
const AdminTeamsPage = lazy(() => import('@/modules/admin/pages/AdminTeamsPage'))
const AdminProjectsPage = lazy(() => import('@/modules/admin/pages/AdminProjectsPage'))
const AdminLabelsPage = lazy(() => import('@/modules/admin/pages/AdminLabelsPage'))

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingPage />}>{children}</Suspense>
}

function RootRedirect() {
  return <Navigate to={ROUTES.LOGIN} replace />
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) return <LoadingPage />
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <RootRedirect />,
  },
  {
    path: ROUTES.LOGIN,
    element: (
      <LazyPage>
        <LoginPage />
      </LazyPage>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: ROUTES.DASHBOARD,
        element: (
          <LazyPage>
            <DashboardPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.TIMESHEET,
        element: (
          <LazyPage>
            <TimesheetPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.PROJECTS,
        element: (
          <LazyPage>
            <ProjectsPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.PROJECT_DETAIL,
        element: (
          <LazyPage>
            <ProjectDetailPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.ACTIVITIES,
        element: (
          <LazyPage>
            <ActivitiesPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.ACTIVITY_DETAIL,
        element: (
          <LazyPage>
            <ActivityDetailPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.CALENDAR,
        element: (
          <LazyPage>
            <CalendarPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.REPORTS,
        element: (
          <LazyPage>
            <ReportsPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.SETTINGS,
        element: (
          <LazyPage>
            <SettingsPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.ADMIN.DASHBOARD,
        element: (
          <LazyPage>
            <AdminDashboardPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.ADMIN.MEMBERS,
        element: (
          <LazyPage>
            <AdminMembersPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.ADMIN.DEPARTMENTS,
        element: (
          <LazyPage>
            <AdminDepartmentsPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.ADMIN.TEAMS,
        element: (
          <LazyPage>
            <AdminTeamsPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.ADMIN.PROJECTS,
        element: (
          <LazyPage>
            <AdminProjectsPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.ADMIN.LABELS,
        element: (
          <LazyPage>
            <AdminLabelsPage />
          </LazyPage>
        ),
      },
    ],
  },
])
