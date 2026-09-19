import { test, expect } from '@playwright/test'

test('timesheet renders in demo mode without crashing', async ({ page }) => {
  await page.goto('/login')
  const config = await page.evaluate(() => (window as any).__TASKY_CONFIG__ || {})
  test.skip(config.DEMO_MODE !== 'true', 'demo mode off in this build')
  await page.goto('/timesheet')
  await expect(page).toHaveURL(/\/timesheet/)
  await expect(page.locator('body')).not.toContainText('Something went wrong')
})
