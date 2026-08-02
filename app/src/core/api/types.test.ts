import { describe, it, expect } from 'vitest'
import { isValidFibonacciWeight, FIBONACCI_WEIGHTS } from '@/core/api/types'
import type { ActivityTemplateResponse } from '@/core/api/types'

describe('Fibonacci weights', () => {
  it('valid values are 1, 2, 3, 5, 8, 13', () => {
    expect(FIBONACCI_WEIGHTS).toEqual([1, 2, 3, 5, 8, 13])
  })

  it('isValidFibonacciWeight returns true for valid values', () => {
    expect(isValidFibonacciWeight(1)).toBe(true)
    expect(isValidFibonacciWeight(2)).toBe(true)
    expect(isValidFibonacciWeight(3)).toBe(true)
    expect(isValidFibonacciWeight(5)).toBe(true)
    expect(isValidFibonacciWeight(8)).toBe(true)
    expect(isValidFibonacciWeight(13)).toBe(true)
  })

  it('isValidFibonacciWeight returns false for invalid values', () => {
    expect(isValidFibonacciWeight(0)).toBe(false)
    expect(isValidFibonacciWeight(4)).toBe(false)
    expect(isValidFibonacciWeight(6)).toBe(false)
    expect(isValidFibonacciWeight(7)).toBe(false)
    expect(isValidFibonacciWeight(9)).toBe(false)
    expect(isValidFibonacciWeight(10)).toBe(false)
    expect(isValidFibonacciWeight(14)).toBe(false)
    expect(isValidFibonacciWeight(21)).toBe(false)
  })
})

describe('UUID type', () => {
  it('UUID is type alias for string', () => {
    const id: string = '550e8400-e29b-41d4-a716-446655440000'
    expect(typeof id).toBe('string')
  })
})

describe('activity template contract', () => {
  it('represents a versioned recurring activity template', () => {
    const template: ActivityTemplateResponse = {
      id: 'template-id',
      projectId: 'project-id',
      name: 'Revisão semanal',
      version: 2,
      title: 'Revisar indicadores',
      description: null,
      weight: 3,
      durationSeconds: 3600,
      estimatedSeconds: 1800,
      assignedToMembershipId: 'membership-id',
      recurrence: {
        id: 'recurrence-id',
        frequency: 'WEEKLY',
        interval: 1,
        timezone: 'America/Sao_Paulo',
        nextOccurrence: '2026-08-03T12:00:00Z',
        active: true,
      },
      createdAt: '2026-08-01T12:00:00Z',
    }

    expect(template.version).toBe(2)
    expect(template.recurrence?.timezone).toBe('America/Sao_Paulo')
  })
})
