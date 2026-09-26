import type { ReactNode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/core/auth/authStore'
import { server } from '@/test/server'
import PeriodBar from './PeriodBar'

const ORG = { id: 'org-1', name: 'Órgão', slug: 'orgao', role: 'employee', timezone: 'America/Sao_Paulo', workWeekStartsOn: 1 } as const

function period(status: string) {
  return {
    id: 'period-1', organizationId: 'org-1', membershipId: 'mem-1',
    periodStart: new Date().toISOString(), periodEnd: new Date().toISOString(),
    status, submittedAt: null, approvedAt: null, approvedBy: null, rejectionComment: null,
    version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}

function seedAuth() {
  useAuthStore.setState({
    token: 'test-token',
    user: { id: 'user-1', email: 'a@example.com', username: 'a', displayName: 'A', avatarUrl: null },
    organizations: [{ ...ORG }],
    activeOrg: { ...ORG },
    isAuthenticated: true,
    isLoading: false,
    isDemo: false,
  })
}

function renderBar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return render(<PeriodBar weekStartISO={new Date().toISOString()} weekEndISO={new Date().toISOString()} />, { wrapper })
}

describe('PeriodBar', () => {
  beforeEach(seedAuth)

  it('offers to open the week when there is no period', async () => {
    server.use(http.get('http://localhost/api/v1/timesheets/periods', () => HttpResponse.json([])))
    renderBar()

    expect(await screen.findByText('Abrir semana')).toBeInTheDocument()
  })

  it('submits a draft period and shows the submitted state', async () => {
    let status = 'DRAFT'
    server.use(
      http.get('http://localhost/api/v1/timesheets/periods', () => HttpResponse.json([period(status)])),
      http.post('http://localhost/api/v1/timesheets/periods/:periodId/submit', () => {
        status = 'SUBMITTED'
        return HttpResponse.json(period(status))
      }),
    )
    renderBar()

    expect(await screen.findByText('Rascunho')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar para aprovação' }))
    expect(await screen.findByText('Aguardando aprovação')).toBeInTheDocument()
  })

  it('reopens a submitted period', async () => {
    let status = 'SUBMITTED'
    server.use(
      http.get('http://localhost/api/v1/timesheets/periods', () => HttpResponse.json([period(status)])),
      http.post('http://localhost/api/v1/timesheets/periods/:periodId/reopen', () => {
        status = 'DRAFT'
        return HttpResponse.json(period(status))
      }),
    )
    renderBar()

    expect(await screen.findByText('Aguardando aprovação')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }))
    expect(await screen.findByText('Rascunho')).toBeInTheDocument()
  })
})
