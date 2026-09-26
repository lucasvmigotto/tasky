import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
/**
 * Captures real UI screenshots from the running TaskY dev stack and writes
 * them to public/screenshots/ (served by the docs site). Re-runnable so the
 * examples cannot go stale.
 *
 * Requires: the development stack up, app served at TASKY_APP_URL
 * (default http://localhost:5173), mock OIDC enabled, and — for non-empty
 * screens — TASKY_SEED_DATA=true with TASKY_SEED_PROFILE=large.
 *
 *   bun run screenshots
 */
import { type Page, chromium } from '@playwright/test'

const APP = process.env.TASKY_APP_URL || 'http://localhost:5173'
// The mock provider namespaces the entered username as the subject, and the
// seeder stores the same `mock-google:` prefix — so entering a seeded sub
// (e.g. `seed-sub-1`, a manager with time entries) logs in as that user.
const MOCK_USER = process.env.TASKY_MOCK_USER || 'seed-sub-1'
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'screenshots')
const VIEWPORT = { width: 1440, height: 900 }

interface Shot {
  name: string
  path: string
  fullPage?: boolean
  wait?: number
  /** Skip admin/manager-only screens when the persona lacks the role. */
  requiresRole?: 'admin' | 'manager'
}

const SHOTS: Shot[] = [
  { name: 'my-work', path: '/my-work', wait: 2500 },
  { name: 'time-tracker', path: '/time-tracker', wait: 2500 },
  { name: 'timesheet', path: '/timesheet', wait: 3000 },
  { name: 'approval-queue', path: '/timesheet', wait: 3000 },
  { name: 'reports', path: '/reports', wait: 3000 },
]

/** Optional comma-separated allow-list, e.g. TASKY_SHOTS=login,admin-members. */
function selectedShots(): Shot[] {
  const only = process.env.TASKY_SHOTS
  if (!only) return SHOTS
  const names = new Set(only.split(',').map((s) => s.trim()))
  return SHOTS.filter((s) => names.has(s.name))
}

async function mockLogin(page: Page): Promise<void> {
  const exchange = page.waitForResponse(
    (r) => r.url().includes('/auth/oidc/code') && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await page.goto(`${APP}/login`)
  await page.getByRole('button', { name: 'Mock Google' }).click()
  await page.waitForURL((url) => url.host.includes('localhost') && url.port !== new URL(APP).port, {
    timeout: 15_000,
  })
  await page.locator('input[name="username"]').fill(MOCK_USER)
  await page.locator('button[type="submit"], input[type="submit"]').first().click()
  const res = await exchange
  if (res.status() !== 200) throw new Error(`mock login failed: ${res.status()} ${await res.text()}`)
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    // The local mock OIDC proxy uses a mkcert cert; run `mkcert -install` to
    // trust it system-wide, or accept the bypass here.
    ignoreHTTPSErrors: true,
  })
  const page = await context.newPage()
  const shots = selectedShots()
  const wanted = new Set(shots.map((s) => s.name))

  // Login screen first (public, no session needed).
  if (wanted.has('login') || !process.env.TASKY_SHOTS) {
    await page.goto(`${APP}/login`)
    await page.waitForTimeout(800)
    await page.screenshot({ path: resolve(OUT, 'login.png') })
    console.log('captured login.png')
  }

  await mockLogin(page)

  for (const shot of shots) {
    await page.goto(`${APP}${shot.path}`)
    // Wait for the SPA's data queries to settle, then a short paint margin.
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(shot.wait ?? 1000)
    // Route guards redirect unauthorized pages; skip instead of capturing a redirect.
    const landed = new URL(page.url()).pathname
    if (!landed.startsWith(shot.path.split('?')[0])) {
      console.warn(`skip ${shot.name}: redirected to ${landed} (role not permitted)`)
      continue
    }
    const error = page.getByText(/Algo deu errado|Something went wrong/i)
    if (await error.count()) {
      console.warn(`skip ${shot.name}: page error state`)
      continue
    }
    if (shot.name === 'approval-queue') {
      // Bring the queue into view (it sits below the timesheet grid).
      await page
        .getByText('Aprovações pendentes')
        .scrollIntoViewIfNeeded()
        .catch(() => {})
      await page.waitForTimeout(400)
    }
    await page.screenshot({ path: resolve(OUT, `${shot.name}.png`), fullPage: shot.fullPage ?? false })
    console.log(`captured ${shot.name}.png`)
  }

  await context.close()
  await browser.close()
  console.log(`screenshots written to ${OUT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
