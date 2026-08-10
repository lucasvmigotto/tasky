import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SectorOverviewResponse } from '@/core/api/types'
import { useAuthStore } from '@/core/auth/authStore'
import { server } from '@/test/server'
import MySectorPage from './MySectorPage'

const managerOverview: SectorOverviewResponse = {
  role: 'manager',
  departments: [{ id: 'department-1', name: 'Tecnologia da Informação' }],
  members: [
    { id: 'member-1', displayName: 'Maria Gestora', role: 'manager', departmentId: 'department-1', openActivities: 1, estimatedSeconds: 7200 },
    { id: 'member-2', displayName: 'Ana Silva', role: 'employee', departmentId: 'department-1', openActivities: 3, estimatedSeconds: 14400 },
  ],
  projects: [{ id: 'project-1', departmentId: 'department-1', name: 'Portal do Servidor', active: true }],
  activityCounts: { TODO: 2, IN_PROGRESS: 1, IN_TESTING: 0, BLOCKED: 1, DONE: 4, CANCELED: 0 },
  queue: [{
    id: 'activity-1',
    projectId: 'project-1',
    projectName: 'Portal do Servidor',
    title: 'Publicar novo formulário',
    status: 'BLOCKED',
    priority: 'HIGH',
    dueDate: '2026-08-10T12:00:00Z',
    assignedTo: 'member-2',
    assigneeName: 'Ana Silva',
  }],
}

describe('MySectorPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'test-token',
      user: { id: 'user-1', email: 'gestora@example.gov.br', username: 'gestora', displayName: 'Maria Gestora', avatarUrl: null },
      organizations: [{ id: 'org-1', name: 'Órgão', slug: 'orgao', role: 'manager', timezone: 'America/Sao_Paulo', workWeekStartsOn: 1 }],
      activeOrg: { id: 'org-1', name: 'Órgão', slug: 'orgao', role: 'manager', timezone: 'America/Sao_Paulo', workWeekStartsOn: 1 },
      isAuthenticated: true,
      isLoading: false,
      isDemo: false,
    })
  })

  it('renders the server-scoped sector structure, workload and queue', async () => {
    server.use(http.get('/api/v1/me/sector', () => HttpResponse.json(managerOverview)))
    renderPage()

    expect(await screen.findByText('Tecnologia da Informação')).toBeInTheDocument()
    expect(screen.getByText('Chefe de setor')).toBeInTheDocument()
    expect(screen.getAllByText('Ana Silva')).toHaveLength(2)
    expect(screen.getByText('4h · 3 tarefas')).toBeInTheDocument()
    expect(screen.getByText('Publicar novo formulário')).toBeInTheDocument()
    expect(screen.getAllByText('Portal do Servidor')).toHaveLength(2)
  })

  it('does not invent organization data when the employee has no valid placement', async () => {
    useAuthStore.setState((state) => ({
      ...state,
      activeOrg: state.activeOrg ? { ...state.activeOrg, role: 'employee' } : null,
    }))
    server.use(http.get('/api/v1/me/sector', () => HttpResponse.json({
      role: 'employee',
      departments: [],
      members: [],
      projects: [],
      activityCounts: { TODO: 0, IN_PROGRESS: 0, IN_TESTING: 0, BLOCKED: 0, DONE: 0, CANCELED: 0 },
      queue: [],
    } satisfies SectorOverviewResponse)))
    renderPage()

    expect(await screen.findByText('Lotação não configurada')).toBeInTheDocument()
    expect(screen.getByText(/não possui um setor válido/i)).toBeInTheDocument()
    expect(screen.queryByText('Tecnologia da Informação')).not.toBeInTheDocument()
  })
})

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  return render(<MySectorPage />, { wrapper })
}
