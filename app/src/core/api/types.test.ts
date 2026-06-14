import { describe, it, expect } from 'vitest'
import { isValidFibonacciWeight, FIBONACCI_WEIGHTS } from '@/core/api/types'

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
