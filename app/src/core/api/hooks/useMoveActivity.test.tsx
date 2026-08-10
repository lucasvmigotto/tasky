import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { ActivityResponse } from '@/core/api/types'
import { useMoveActivity } from '@/core/api/hooks'
import { server } from '@/test/server'

const activity: ActivityResponse = {
  id: 'activity-rollback',
  projectId: 'project-1',
  parentActivityId: null,
  title: 'Atividade com rollback',
  description: null,
  weight: 3,
  startDatetime: '2026-08-01T12:00:00Z',
  endDatetime: '2026-08-01T13:00:00Z',
  status: 'TODO',
  taskType: 'TASK',
  priority: 'NORMAL',
  dueDate: null,
  position: 1000,
  completedAt: null,
  estimatedSeconds: 3600,
  createdBy: 'member-1',
  assignedTo: 'member-1',
  assigneeIds: ['member-1'],
  parentIds: [],
  checklistTotal: 0,
  checklistCompleted: 0,
  createdAt: '2026-08-01T12:00:00Z',
  version: 1,
}

describe('useMoveActivity', () => {
  it('restores every activity cache when the move request fails', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const listKey = ['activities', 'query', {}] as const
    const detailKey = ['activities', activity.id] as const
    queryClient.setQueryData(listKey, [activity])
    queryClient.setQueryData(detailKey, activity)
    server.use(
      http.patch('/api/v1/activities/:activityId/move', () =>
        HttpResponse.json({ detail: 'Falha simulada' }, { status: 500 }),
      ),
    )

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useMoveActivity(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({
        activityId: activity.id,
        data: { status: 'IN_PROGRESS', position: 2000 },
      })).rejects.toThrow()
    })

    expect(queryClient.getQueryData<ActivityResponse[]>(listKey)?.[0]).toMatchObject({ status: 'TODO', position: 1000 })
    expect(queryClient.getQueryData<ActivityResponse>(detailKey)).toMatchObject({ status: 'TODO', position: 1000 })
  })
})
