import { test, expect } from '@playwright/test'

test('unauthenticated deep link lands on login', async ({ page }) => {
  await page.goto('/login')
  await page.goto('/reports')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Faça login para continuar')).toBeVisible()
})

test('login page offers mock providers when enabled', async ({ page }) => {
  await page.goto('/login')
  const config = await page.evaluate(() => (window as any).__TASKY_CONFIG__ || {})
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible()
  const mockSection = page.getByText('Ambiente local (mock)')
  if (String(config.MOCK_OAUTH2_ENABLED) === 'true') {
    await expect(mockSection).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mock Google' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mock Microsoft' })).toBeVisible()
  }
})
