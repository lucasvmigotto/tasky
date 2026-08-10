import { describe, expect, it } from 'vitest'
import { dateKeyInTimeZone, zonedDateTimeToIso } from './timezone'

describe('timezone helpers', () => {
  it('converts local organization time to UTC instant', () => {
    expect(zonedDateTimeToIso('2026-01-01', '09:00', 'America/Sao_Paulo')).toBe('2026-01-01T12:00:00.000Z')
  })

  it('groups instants by date in the requested timezone', () => {
    expect(dateKeyInTimeZone('2026-01-02T02:30:00.000Z', 'America/Sao_Paulo')).toBe('2026-01-01')
  })
})
