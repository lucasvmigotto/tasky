import type { ReactNode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/core/auth/authStore'
import { server } from '@/test/server'
import ApprovalQueue from './ApprovalQueue'

function queueItem(id: string, name: string) {
  return {
    id, organizationId: 'org-1', membershipId: 'mem-9', ownerUsername: 'emp', ownerDisplayName: name,
    periodStart: new Date().toISOString(), periodEnd: new Date().toISOString(),
    submittedAt: new Date().toISOString(), version: 1, totalSeconds: 28800, billableSeconds: 14400, entryCount: 8,
  }
}

function seedAuth(role: 'manager' | 'employee') {
  const org = { id: 'org-1', name: 'Órgão', slug: 'orgao', role, timezone: 'America/Sao_Paulo', workWeekStartsOn: 1 }
  useAuthStore.setState({
    token: 'test-token',
    user: { id: 'user-1', email: 'a@example.com', username: 'a', displayName: 'A', avatarUrl: null },
    organizations: [org],
    activeOrg: org,
    isAuthenticated: true,
    isLoading: false,
    isDemo: false,
  })
}

function renderQueue() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return render(<ApprovalQueue />, { wrapper })
}

describe('ApprovalQueue', () => {
  beforeEach(() => seedAuth('manager'))

  it('lists pending periods and approves one', async () => {
    let queue = [queueItem('p-1', 'Ana Silva'), queueItem('p-2', 'Carlos Souza')]
    server.use(
      http.get('http://localhost/api/v1/timesheets/periods/approval-queue', () => HttpResponse.json(queue)),
      http.post('http://localhost/api/v1/timesheets/periods/approve', async ({ request }) => {
        const body = (await request.json()) as { periodIds: string[] }
        queue = queue.filter((q) => !body.periodIds.includes(q.id))
        return HttpResponse.json([])
      }),
    )
    renderQueue()

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument()
    const approveButtons = await screen.findAllByRole('button', { name: 'Aprovar' })
    fireEvent.click(approveButtons[0])
    expect(await screen.findByText('Carlos Souza')).toBeInTheDocument()
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument()
  })

  it('rejects with a mandatory comment', async () => {
    let queue = [queueItem('p-1', 'Ana Silva')]
    let rejectedComment: string | null = null
    server.use(
      http.get('http://localhost/api/v1/timesheets/periods/approval-queue', () => HttpResponse.json(queue)),
      http.post('http://localhost/api/v1/timesheets/periods/reject', async ({ request }) => {
        const body = (await request.json()) as { periodIds: string[]; comment: string }
        rejectedComment = body.comment
        queue = []
        return HttpResponse.json([])
      }),
    )
    renderQueue()

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    // Empty comment is refused client-side: item stays.
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/motivo/i), { target: { value: 'Horas inconsistentes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Nenhuma semana aguardando aprovação.')).toBeInTheDocument()
    expect(rejectedComment).toBe('Horas inconsistentes')
  })

  it('renders nothing for employees', async () => {
    seedAuth('employee')
    renderQueue()

    expect(screen.queryByText('Aprovações pendentes')).not.toBeInTheDocument()
  })
})
