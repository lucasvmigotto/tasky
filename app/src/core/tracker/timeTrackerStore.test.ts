import { describe, expect, it } from 'vitest'
import { reconcileTrackerState } from './timeTrackerStore'
import type { TimeEntryResponse } from '@/core/api/types'

function entry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  return {
    id: 'te-1',
    organizationId: 'org-1',
    membershipId: 'mem-1',
    userId: 'user-1',
    projectId: null,
    activityId: null,
    description: 'Task',
    startTime: new Date(Date.now() - 3600_000).toISOString(),
    endTime: null,
    durationSeconds: null,
    pausedSeconds: 0,
    pausedAt: null,
    approvalStatus: 'DRAFT',
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    rejectionComment: null,
    billingRateSnapshot: null,
    costRateSnapshot: null,
    billable: false,
    createdAt: new Date().toISOString(),
    version: 0,
    ...overrides,
  }
}

describe('reconcileTrackerState', () => {
  it('ignores when server state is not loaded yet', () => {
    expect(reconcileTrackerState({ entry: entry(), isRunning: true }, undefined))
      .toEqual({ action: 'ignore' })
  })

  it('ignores when there is no local entry', () => {
    expect(reconcileTrackerState({ entry: null, isRunning: false }, entry()))
      .toEqual({ action: 'ignore' })
  })

  it('finishes when the server has no running entry', () => {
    expect(reconcileTrackerState({ entry: entry(), isRunning: true }, null))
      .toEqual({ action: 'finished', message: 'Timer finalizado em outro dispositivo' })
  })

  it('adopts a different server entry', () => {
    const outcome = reconcileTrackerState({ entry: entry({ id: 'te-1' }), isRunning: true }, entry({ id: 'te-2' }))
    expect(outcome.action).toBe('adopt')
  })

  it('finishes when the server entry was stopped elsewhere', () => {
    const outcome = reconcileTrackerState(
      { entry: entry(), isRunning: true },
      entry({ endTime: new Date().toISOString() }),
    )
    expect(outcome.action).toBe('finished')
  })

  it('adopts when paused on the server but running locally', () => {
    const server = entry({ pausedAt: new Date().toISOString(), pausedSeconds: 0 })
    const outcome = reconcileTrackerState({ entry: entry(), isRunning: true }, server)
    expect(outcome).toEqual({ action: 'adopt', entry: server })
  })

  it('adopts when resumed on the server but paused locally', () => {
    const local = entry({ pausedAt: new Date().toISOString(), pausedSeconds: 60 })
    const server = entry({ pausedAt: null, pausedSeconds: 60 })
    const outcome = reconcileTrackerState({ entry: local, isRunning: false }, server)
    expect(outcome).toEqual({ action: 'adopt', entry: server })
  })

  it('ignores converged state', () => {
    const same = entry()
    expect(reconcileTrackerState({ entry: same, isRunning: true }, entry()))
      .toEqual({ action: 'ignore' })
  })
})
