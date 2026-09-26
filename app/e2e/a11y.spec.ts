import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function analyzeLoaded(page, url: string) {
  await page.goto(url)
  // SPA boot + auth redirect: analyze the rendered page, not the shell.
  await page.locator('main').first().waitFor({ timeout: 15_000 })
  return new AxeBuilder({ page }).analyze()
}

test.describe('Accessibility', () => {
  test('home page should have no a11y violations', async ({ page }) => {
    const results = await analyzeLoaded(page, '/')
    expect(results.violations).toEqual([])
  })

  test('login page should have no a11y violations', async ({ page }) => {
    const results = await analyzeLoaded(page, '/login')
    expect(results.violations).toEqual([])
  })

  test('reports page should have no a11y violations', async ({ page }) => {
    const results = await analyzeLoaded(page, '/reports')
    expect(results.violations).toEqual([])
  })
})