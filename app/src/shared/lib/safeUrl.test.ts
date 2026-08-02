import { describe, expect, it } from 'vitest'
import { safeHttpsUrl } from './safeUrl'

describe('safeHttpsUrl', () => {
  it('accepts absolute HTTPS URLs', () => {
    expect(safeHttpsUrl('https://example.com/file.pdf')).toBe('https://example.com/file.pdf')
  })

  it.each(['javascript:alert(1)', 'http://example.com', '/relative', 'not a url'])('rejects unsafe URL %s', (value) => {
    expect(safeHttpsUrl(value)).toBeNull()
  })
})
