import { test, expect } from '@playwright/test'

async function runtimeConfig(page) {
  return page.evaluate(() => (window as any).__TASKY_CONFIG__ || {})
}

test('unauthenticated deep link lands on login (non-demo)', async ({ page }) => {
  await page.goto('/login')
  const config = await runtimeConfig(page)
  test.skip(config.DEMO_MODE === 'true', 'demo auto-login is on')
  await page.goto('/reports')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Faça login para continuar')).toBeVisible()
})

test('login page offers mock providers when enabled', async ({ page }) => {
  await page.goto('/login')
  const config = await runtimeConfig(page)
  test.skip(config.DEMO_MODE === 'true', 'demo skips provider buttons')
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible()
  const mockSection = page.getByText('Ambiente local (mock)')
  if (String(config.MOCK_OAUTH2_ENABLED) === 'true') {
    await expect(mockSection).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mock Google' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mock Microsoft' })).toBeVisible()
  }
})

test('demo auto-login keeps deep links, login bounces to work', async ({ page }) => {
  await page.goto('/login')
  const config = await runtimeConfig(page)
  test.skip(config.DEMO_MODE !== 'true', 'demo mode off in this build')
  await page.goto('/reports')
  await expect(page).toHaveURL(/\/reports/)
  await page.goto('/login')
  await expect(page).toHaveURL(/\/my-work/)
})
