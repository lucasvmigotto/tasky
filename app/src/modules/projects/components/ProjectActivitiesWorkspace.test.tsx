import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ActivityResponse, MembershipResponse, ProjectResponse } from '@/core/api/types'
import { ProjectActivitiesWorkspace } from './ProjectActivitiesWorkspace'

const project: ProjectResponse = {
  id: 'project-1',
  departmentId: 'department-1',
  name: 'Portal do Servidor',
  description: 'Modernização do portal interno',
  managerMembershipId: 'member-1',
  clientId: null,
  hourlyRate: null,
  estimatedSeconds: 14400,
  budgetSeconds: null,
  budgetAmount: null,
  isActive: true,
  createdAt: '2026-08-01T12:00:00Z',
}

const members: MembershipResponse[] = [
  {
    id: 'member-1',
    userId: 'user-1',
    email: 'ana@example.gov.br',
    username: 'ana.silva',
    role: 'employee',
    customUsername: 'Ana Silva',
    maxDailyWorkMinutes: 480,
    primaryDepartmentId: 'department-1',
    primaryTeamId: null,
    timezone: 'America/Sao_Paulo',
    createdAt: '2026-08-01T12:00:00Z',
  },
]

const activities: ActivityResponse[] = [
  {
    id: 'activity-1',
    projectId: project.id,
    parentActivityId: null,
    title: 'Publicar novo formulário',
    description: null,
    weight: 3,
    startDatetime: '2026-08-01T12:00:00Z',
    endDatetime: '2026-08-03T12:00:00Z',
    status: 'TODO',
    taskType: 'IMPROVEMENT',
    priority: 'HIGH',
    dueDate: '2026-08-04T12:00:00Z',
    position: 1000,
    completedAt: null,
    estimatedSeconds: 7200,
    createdBy: 'member-1',
    assignedTo: 'member-1',
    labelIds: [],
    parentIds: [],
    checklistTotal: 4,
    checklistCompleted: 2,
    createdAt: '2026-08-01T12:00:00Z',
    version: 1,
  },
  {
    id: 'activity-2',
    projectId: project.id,
    parentActivityId: null,
    title: 'Revisar conteúdo antigo',
    description: null,
    weight: 2,
    startDatetime: '2026-07-28T12:00:00Z',
    endDatetime: '2026-07-30T12:00:00Z',
    status: 'DONE',
    taskType: 'TASK',
    priority: 'NORMAL',
    dueDate: null,
    position: 1000,
    completedAt: '2026-07-30T12:00:00Z',
    estimatedSeconds: 3600,
    createdBy: 'member-1',
    assignedTo: 'member-1',
    labelIds: [],
    parentIds: [],
    checklistTotal: 0,
    checklistCompleted: 0,
    createdAt: '2026-07-28T12:00:00Z',
    version: 1,
  },
]

function LocationProbe() {
  const location = useLocation()
  return <p>Nova atividade: {location.search}</p>
}

function renderWorkspace(initialEntry = '/projects/project-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/projects/:projectId" element={children} />
          <Route path="/activities" element={<LocationProbe />} />
          <Route path="/activities/:activityId" element={<p>Detalhe da atividade</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )

  return render(
    <ProjectActivitiesWorkspace
      project={project}
      activities={activities}
      members={members}
      isLoading={false}
      error={null}
    />,
    { wrapper },
  )
}

describe('ProjectActivitiesWorkspace', () => {
  it('combines text and status filters using the persisted activity status', () => {
    renderWorkspace()

    expect(screen.getByText('Publicar novo formulário')).toBeInTheDocument()
    expect(screen.getByText('Revisar conteúdo antigo')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filtrar por status'), { target: { value: 'TODO' } })
    fireEvent.change(screen.getByLabelText('Buscar atividades'), { target: { value: 'publicar' } })

    expect(screen.getByText('Publicar novo formulário')).toBeInTheDocument()
    expect(screen.queryByText('Revisar conteúdo antigo')).not.toBeInTheDocument()
    const activityRow = screen.getByText('Publicar novo formulário').closest('tr')
    expect(activityRow).not.toBeNull()
    expect(within(activityRow!).getByText('A Fazer')).toBeInTheDocument()
  })

  it('switches workspace views and opens creation with the project preselected', () => {
    renderWorkspace()

    fireEvent.click(screen.getByRole('button', { name: 'Quadro' }))
    expect(screen.getByLabelText('Quadro de atividades')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Timeline' }))
    expect(screen.getByText('Atividade')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Nova atividade' }))
    expect(screen.getByText('Nova atividade: ?projectId=project-1&new=1')).toBeInTheDocument()
  })
})
