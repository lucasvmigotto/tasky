import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/core/auth/authStore'
import { server } from '@/test/server'
import AdminMembersPage from './AdminMembersPage'

describe('AdminMembersPage organizational placement', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'test-token',
      user: { id: 'user-1', email: 'admin@test.com', username: 'admin', displayName: 'Admin', avatarUrl: null },
      organizations: [{ id: 'org-1', name: 'Órgão', slug: 'orgao', role: 'admin', timezone: 'America/Sao_Paulo', workWeekStartsOn: 1 }],
      activeOrg: { id: 'org-1', name: 'Órgão', slug: 'orgao', role: 'admin', timezone: 'America/Sao_Paulo', workWeekStartsOn: 1 },
      isAuthenticated: true,
      isLoading: false,
      isDemo: false,
    })
  })

  it('sends department and team when inviting a team leader', async () => {
    let requestBody: Record<string, unknown> | null = null
    server.use(
      http.get('/api/v1/organizations/:orgId/memberships/invitations', () => HttpResponse.json([{
        id: 'invitation-1',
        email: 'pendente@orgao.gov.br',
        role: 'employee',
        primaryDepartmentId: 'dept-1',
        primaryTeamId: 'team-1',
        status: 'PENDING',
        invitedAt: '2026-08-01T12:00:00Z',
        expiresAt: '2026-08-15T12:00:00Z',
        acceptedAt: null,
        revokedAt: null,
      }])),
      http.post('/api/v1/organizations/:orgId/memberships/invite', async ({ request }) => {
        requestBody = await request.json() as Record<string, unknown>
        return HttpResponse.json({
          id: 'member-new',
          email: 'lider@orgao.gov.br',
          role: 'leader',
          primaryDepartmentId: 'dept-1',
          primaryTeamId: 'team-1',
          status: 'PENDING',
          invitedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1209600000).toISOString(),
          acceptedAt: null,
          revokedAt: null,
        }, { status: 201 })
      }),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    render(<AdminMembersPage />, { wrapper })
    await screen.findByText('admin#test1234')
    expect(await screen.findByText('pendente@orgao.gov.br')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar membro' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(screen.getByPlaceholderText('Endereço de e-mail'), { target: { value: 'lider@orgao.gov.br' } })
    fireEvent.change(screen.getByLabelText('Função'), { target: { value: 'leader' } })
    fireEvent.change(screen.getByLabelText('Setor'), { target: { value: 'dept-1' } })
    fireEvent.change(screen.getByLabelText('Equipe liderada'), { target: { value: 'team-1' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Adicionar membro' }))

    await waitFor(() => expect(requestBody).toEqual(expect.objectContaining({
      email: 'lider@orgao.gov.br',
      role: 'leader',
      departmentIds: ['dept-1'],
      teamIds: ['team-1'],
    })))
  })
})
