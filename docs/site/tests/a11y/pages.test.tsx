import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { PAGE_IDS } from '../../src/i18n/types'
import { renderPage } from './harness'

describe('accessibility', () => {
  for (const pageId of PAGE_IDS) {
    it(`${pageId} has no a11y violations`, async () => {
      const { container } = renderPage(pageId)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  }

  it('has no a11y violations in English', async () => {
    const { container } = renderPage('overview', 'en')
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
