import { Suspense, lazy } from 'react'
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/core/auth/authStore'
import { ROUTES } from '@/core/config/routes'
import DashboardLayout from '@/app/layouts/DashboardLayout'
import LoadingPage from '@/shared/components/feedback/LoadingPage'
import { ErrorBoundary } from '@/core/errors/ErrorBoundary'
import { canViewMySector } from '@/core/auth/permissions'

function LazyLoadError() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-semibold text-foreground">Falha ao carregar a tela</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        A versão da interface mudou. Recarregue a página para baixar os arquivos novos.
      </p>
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        onClick={() => window.location.reload()}
      >
        Recarregar
      </button>
    </div>
  )
}

function RouteError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-semibold text-foreground">Não foi possível carregar esta tela</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        O menu continua disponível. Tente novamente ou volte para Meu Trabalho.
      </p>
      <div className="flex gap-2">
        <button
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
          onClick={onRetry}
        >
          Tentar novamente
        </button>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => window.location.assign(ROUTES.MY_WORK)}
        >
          Ir para Meu Trabalho
        </button>
      </div>
    </div>
  )
}

function lazyWithRetry(factory: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() => {
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Route chunk timed out')), 15000)
    })

    // A transient connection failure should not turn one click into a dead route.
    const load = factory().catch(async (error) => {
      console.warn('[lazyWithRetry] Retrying route chunk', error)
      await new Promise((resolve) => window.setTimeout(resolve, 150))
      return factory()
    })

    return Promise.race([load, timeout]).catch((error) => {
      // Do not leave Suspense pending: that makes the URL change without a screen change.
      console.error('[lazyWithRetry] Failed to load route chunk', error)
      return { default: LazyLoadError }
    })
  })
}

const LoginPage = lazyWithRetry(() => import('@/modules/auth/pages/LoginPage'))
const MyWorkPage = lazyWithRetry(() => import('@/modules/work/pages/MyWorkPage'))
const MySectorPage = lazyWithRetry(() => import('@/modules/sector/pages/MySectorPage'))
const DashboardPage = lazyWithRetry(() => import('@/modules/dashboard/pages/DashboardPage'))
const RequestsPage = lazyWithRetry(() => import('@/modules/requests/pages/RequestsPage'))
const RequestDetailPage = lazyWithRetry(() => import('@/modules/requests/pages/RequestDetailPage'))
const TimesheetPage = lazyWithRetry(() => import('@/modules/timesheet/pages/TimesheetPage'))
const TimeTrackerPage = lazyWithRetry(() => import('@/modules/time-tracker/pages/TimeTrackerPage'))
const ProjectsPage = lazyWithRetry(() => import('@/modules/projects/pages/ProjectsPage'))
const ProjectDetailPage = lazyWithRetry(() => import('@/modules/projects/pages/ProjectDetailPage'))
const ActivitiesPage = lazyWithRetry(() => import('@/modules/activities/pages/ActivitiesPage'))
const ActivityDetailPage = lazyWithRetry(() => import('@/modules/activities/pages/ActivityDetailPage'))
const TimelinePage = lazyWithRetry(() => import('@/modules/timeline/pages/TimelinePage'))
const CalendarPage = lazyWithRetry(() => import('@/modules/calendar/pages/CalendarPage'))
const ReportsPage = lazyWithRetry(() => import('@/modules/reports/pages/ReportsPage'))
const SettingsPage = lazyWithRetry(() => import('@/modules/settings/pages/SettingsPage'))
const AdminDashboardPage = lazyWithRetry(() => import('@/modules/admin/pages/AdminDashboardPage'))
const AdminMembersPage = lazyWithRetry(() => import('@/modules/admin/pages/AdminMembersPage'))
const AdminDepartmentsPage = lazyWithRetry(() => import('@/modules/admin/pages/AdminDepartmentsPage'))
const AdminProjectsPage = lazyWithRetry(() => import('@/modules/admin/pages/AdminProjectsPage'))

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<RouteError onRetry={() => window.location.reload()} />}
    >
      <Suspense fallback={<LoadingPage />}>{children}</Suspense>
    </ErrorBoundary>
  )
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

function MySectorRoute({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((state) => state.activeOrg?.role)
  if (!role || !canViewMySector(role)) {
    return <Navigate to={ROUTES.ADMIN.DASHBOARD} replace />
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
    errorElement: <RouteError onRetry={() => window.location.reload()} />,
    children: [
      {
        path: ROUTES.MY_WORK,
        element: (
          <LazyPage>
            <MyWorkPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.MY_SECTOR,
        element: (
          <MySectorRoute>
            <LazyPage>
              <MySectorPage />
            </LazyPage>
          </MySectorRoute>
        ),
      },
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
        path: ROUTES.TIME_TRACKER,
        element: (
          <LazyPage>
            <TimeTrackerPage />
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
        path: ROUTES.REQUESTS,
        element: (
          <LazyPage>
            <RequestsPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.REQUEST_DETAIL,
        element: (
          <LazyPage>
            <RequestDetailPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.TIMELINE,
        element: (
          <LazyPage>
            <TimelinePage />
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
        path: ROUTES.ADMIN.PROJECTS,
        element: (
          <LazyPage>
            <AdminProjectsPage />
          </LazyPage>
        ),
      },
    ],
  },
])
