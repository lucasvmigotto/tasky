import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ActivityResponse } from '@/core/api/types'
import { ActivityCard } from '@/shared/components/kanban/ActivityCard'
import { calculatePosition } from '@/shared/components/kanban/KanbanBoard'

const activity: ActivityResponse = {
  id: 'activity-1',
  projectId: 'project-1',
  parentActivityId: null,
  title: 'Publicar portal interno',
  description: null,
  weight: 3,
  startDatetime: '2026-08-01T12:00:00Z',
  endDatetime: '2026-08-01T13:00:00Z',
  status: 'TODO',
  taskType: 'IMPROVEMENT',
  priority: 'HIGH',
  dueDate: '2026-08-10T12:00:00Z',
  position: 1000,
  completedAt: null,
  estimatedSeconds: 3600,
  createdBy: 'member-1',
  assignedTo: 'member-1',
  parentIds: [],
  checklistTotal: 4,
  checklistCompleted: 2,
  createdAt: '2026-08-01T12:00:00Z',
  version: 1,
}

describe('Kanban position calculation', () => {
  it('keeps spacing at the start, middle and end of a column', () => {
    const second = { ...activity, id: 'activity-2', position: 3000 }
    expect(calculatePosition([activity, second], 0)).toBe(0)
    expect(calculatePosition([activity, second], 1)).toBe(2000)
    expect(calculatePosition([activity, second], 2)).toBe(4000)
  })

  it('lets the backend choose the first position for an empty column', () => {
    expect(calculatePosition([], 0)).toBeUndefined()
  })
})

describe('ActivityCard', () => {
  it('shows operational metadata and offers an accessible move fallback', () => {
    const onMoveTo = vi.fn()
    render(
      <ActivityCard
        activity={activity}
        memberName="Ana Silva"
        projectName="Portal Interno"
        statuses={['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELED']}
        onMoveTo={onMoveTo}
      />,
    )

    expect(screen.getByText('Melhoria')).toBeInTheDocument()
    expect(screen.getByLabelText('Checklist: 2 de 4')).toHaveAttribute('aria-valuenow', '50')

    fireEvent.change(screen.getByLabelText('Mover Publicar portal interno para outra coluna'), {
      target: { value: 'IN_PROGRESS' },
    })
    expect(onMoveTo).toHaveBeenCalledWith('IN_PROGRESS')
  })
})
