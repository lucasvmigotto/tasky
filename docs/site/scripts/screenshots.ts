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
  const shots = selectedShots()
  // `login` is captured separately (not in SHOTS), so an explicit
  // TASKY_SHOTS=login must still trigger it; otherwise capture it whenever the
  // full set runs.
  const captureLogin =
    !process.env.TASKY_SHOTS ||
    process.env.TASKY_SHOTS.split(',')
      .map((s) => s.trim())
      .includes('login')

  // Login screen first (public, no session needed). The documentation image
  // must show the real sign-in options (Google + Microsoft) and not the
  // local mock panel, so this shot uses its own page with the runtime config
  // overridden: both client IDs present, mock buttons hidden. The harness
  // still needs the mock provider to log in, so the authenticated screens use
  // a separate page without the override.
  if (captureLogin) {
    const loginPage = await context.newPage()
    // The served `runtime-config.js` assigns window.__TASKY_CONFIG__ after any
    // init script, so the override must replace the response itself. Rewrite
    // it on the fly: both client IDs present, mock buttons hidden. Only this
    // page is affected; the authenticated screens keep the real config.
    await loginPage.route('**/runtime-config.js', async (route) => {
      const response = await route.fetch()
      const body = await response.text()
      const patched = body
        .replace(
          /GOOGLE_CLIENT_ID: '[^']*'/,
          "GOOGLE_CLIENT_ID: 'tasky-docs-google.apps.googleusercontent.com'",
        )
        .replace(/MICROSOFT_CLIENT_ID: '[^']*'/, "MICROSOFT_CLIENT_ID: 'tasky-docs-microsoft-client-id'")
        .replace(/MOCK_OAUTH2_ENABLED: '[^']*'/, "MOCK_OAUTH2_ENABLED: 'false'")
      await route.fulfill({ response, body: patched })
    })
    await loginPage.goto(`${APP}/login`)
    await loginPage.waitForTimeout(800)
    await loginPage.screenshot({ path: resolve(OUT, 'login.png') })
    await loginPage.close()
    console.log('captured login.png')
  }

  if (shots.length > 0) {
    const page = await context.newPage()
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
        // The queue sits below the timesheet grid inside a scrollable region;
        // the document itself does not scroll, so bring the section into view
        // by scrolling its nearest scrollable ancestor.
        await page
          .getByText('Aprovações pendentes')
          .first()
          .scrollIntoViewIfNeeded()
          .catch(() => {})
        await page.evaluate(() => {
          const heading = Array.from(document.querySelectorAll('*')).find(
            (el) => el.textContent?.trim() === 'Aprovações pendentes',
          )
          let node: HTMLElement | null = heading as HTMLElement | null
          while (node) {
            const style = getComputedStyle(node)
            const scrollable =
              (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
              node.scrollHeight > node.clientHeight
            if (scrollable) {
              node.scrollTop = node.scrollHeight
              break
            }
            node = node.parentElement
          }
        })
        await page.waitForTimeout(600)
      }
      await page.screenshot({ path: resolve(OUT, `${shot.name}.png`), fullPage: shot.fullPage ?? false })
      console.log(`captured ${shot.name}.png`)
    }
  }

  await context.close()
  await browser.close()
  console.log(`screenshots written to ${OUT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
