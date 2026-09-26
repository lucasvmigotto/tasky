import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PAGES = [
  'overview',
  'getting-started',
  'architecture',
  'domain',
  'features',
  'security-privacy',
  'api',
  'testing',
  'deployment',
  'roadmap',
  'limitations',
]

test.describe('documentation site', () => {
  test('home redirects to the default locale overview', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/#\/(pt-BR|en)\/overview/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  for (const id of PAGES) {
    test(`deep link renders ${id}`, async ({ page }) => {
      await page.goto(`/#/pt-BR/${id}`)
      await expect(page.locator('main')).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
  }

  test('english route renders', async ({ page }) => {
    await page.goto('/#/en/architecture')
    await expect(page.getByRole('heading', { level: 1, name: /Architecture/i })).toBeVisible()
  })

  test('language switch changes the route locale', async ({ page }) => {
    await page.goto('/#/pt-BR/overview')
    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page).toHaveURL(/#\/en\/overview/)
    await expect(page.getByRole('heading', { level: 1, name: /Overview/i })).toBeVisible()
  })

  test('keyboard-only: skip link then nav', async ({ page }) => {
    await page.goto('/#/pt-BR/overview')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: /Pular para o conteúdo/i })).toBeFocused()
  })

  test('search filters pages', async ({ page }) => {
    await page.goto('/#/pt-BR/overview')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.keyboard.press('/')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('searchbox').fill('arquitetura')
    await expect(dialog.getByRole('link', { name: /Arquitetura/ })).toBeVisible()
  })

  test('llms.txt is served', async ({ request }) => {
    const res = await request.get('/llms.txt')
    expect(res.ok()).toBeTruthy()
    const body = await res.text()
    expect(body).toContain('# TaskY')
    expect(body).toContain('llms-full.txt')
  })

  test('served HTML advertises the OG image', async ({ request }) => {
    const res = await request.get('/index.html')
    const html = await res.text()
    expect(html).toMatch(/property="og:image" content="[^"]*og-image\.png"/)
    expect(html).toContain('twitter:card')
  })

  test('og image is served', async ({ request }) => {
    const res = await request.get('/og-image.png')
    expect(res.ok()).toBeTruthy()
    expect(res.headers()['content-type']).toContain('image/png')
  })

  test('no a11y violations on overview', async ({ page }) => {
    await page.goto('/#/pt-BR/overview')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
