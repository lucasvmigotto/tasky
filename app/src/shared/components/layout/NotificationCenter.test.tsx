import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import type { NotificationResponse } from '@/core/api/types'
import { useAuthStore } from '@/core/auth/authStore'
import { server } from '@/test/server'
import { NotificationCenter } from './NotificationCenter'

const notifications: NotificationResponse[] = [
  {
    id: 'notification-1',
    type: 'ACTIVITY_ASSIGNED',
    title: 'Atividade atribuída a você',
    body: 'Revisar documento',
    resourceType: 'activity',
    resourceId: 'activity-1',
    readAt: null,
    createdAt: '2026-08-02T12:00:00Z',
  },
  {
    id: 'notification-2',
    type: 'TIME_ENTRY_APPROVED',
    title: 'Apontamento aprovado',
    body: null,
    resourceType: 'time_entry',
    resourceId: 'entry-1',
    readAt: '2026-08-02T13:00:00Z',
    createdAt: '2026-08-02T11:00:00Z',
  },
]

describe('NotificationCenter', () => {
  beforeEach(() => {
    useAuthStore.setState({ activeOrg: { id: 'org-1', name: 'Órgão', slug: 'orgao', role: 'employee', timezone: 'UTC', workWeekStartsOn: 1 } })
    server.use(
      http.get('/api/v1/notifications', () => HttpResponse.json(notifications)),
      http.get('/api/v1/notifications/unread-count', () => HttpResponse.json({ count: 1 })),
    )
  })

  it('filters unread notifications and marks all as read', async () => {
    let markAllCalls = 0
    server.use(http.patch('/api/v1/notifications/read-all', () => {
      markAllCalls += 1
      return new HttpResponse(null, { status: 204 })
    }))
    renderCenter()

    fireEvent.click(await screen.findByLabelText('Notificações, 1 não lidas'))
    expect(await screen.findByText('Atividade atribuída a você')).toBeInTheDocument()
    expect(screen.getByText('Apontamento aprovado')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Não lidas' }))
    expect(screen.getByText('Atividade atribuída a você')).toBeInTheDocument()
    expect(screen.queryByText('Apontamento aprovado')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }))
    await waitFor(() => expect(markAllCalls).toBe(1))
  })

  it('marks an item and navigates only through its known resource route', async () => {
    let readCalls = 0
    server.use(http.patch('/api/v1/notifications/notification-1/read', () => {
      readCalls += 1
      return HttpResponse.json({ ...notifications[0], readAt: '2026-08-02T14:00:00Z' })
    }))
    renderCenter()

    fireEvent.click(await screen.findByLabelText('Notificações, 1 não lidas'))
    fireEvent.click(await screen.findByText('Atividade atribuída a você'))

    await waitFor(() => expect(readCalls).toBe(1))
    expect(screen.getByTestId('location')).toHaveTextContent('/activities/activity-1')
  })
})

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>
}

function renderCenter() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        {children}
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return render(<NotificationCenter />, { wrapper })
}
