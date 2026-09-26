import { test, expect, type Page } from '@playwright/test'

// Full timer journey against a live backend + mock OIDC provider.
// Run: E2E_API_URL=http://localhost:8080 bun run test:e2e:timer
// ( boots scratch PG + API + mock-oauth2, builds the SPA against them,
//   then runs this file only. Skipped in offline runs without E2E_API_URL. )
const API = process.env.E2E_API_URL || ''

// Logs in through the browser and returns the JWT from the login response.
// Never calls /auth/refresh from the test: a test-side rotation races the
// app's own session management and trips refresh-reuse protection.
async function mockLogin(page: Page, username: string): Promise<string> {
  const codeExchange = page.waitForResponse(
    (r) => r.url().includes('/auth/oidc/code') && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await page.goto('/login')
  const appPort = new URL(page.url()).port
  await page.getByRole('button', { name: 'Mock Google' }).click()
  await page.waitForURL((url) => url.hostname === 'localhost' && url.port !== appPort, { timeout: 15_000 })
  await page.locator('input[name="username"]').fill(username)
  await page.locator('button[type="submit"], input[type="submit"]').first().click()
  const response = await codeExchange
  expect(response.status()).toBe(200)
  const body = (await response.json()) as { token: string }
  expect(body.token).toBeTruthy()
  return body.token
}

function apiFor(page: Page) {
  return (method: string, path: string, token?: string, data?: unknown) =>
    page.request.fetch(`${API}${path}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data,
    })
}

test.describe('timer journey (backend-backed)', () => {
  test.skip(!API, 'E2E_API_URL not set — needs live API + mock OIDC')

  test('start → pause → resume → stop → timesheet → reports', async ({ page, browser }) => {
    const stamp = Date.now().toString(36)
    const description = `E2E timer ${stamp}`
    const projectName = `E2E Projeto ${stamp}`
    const api = apiFor(page)

    // 1. Founder login (browser mock code flow → /auth/oidc/code).
    // Unique mock username per run: parallel runs must not share an identity.
    const founderToken = await mockLogin(page, `founder${stamp}`)

    // 2. Seed org → departments → project.
    const org = await (
      await api('POST', '/api/v1/organizations', founderToken, {
        name: `E2E Org ${stamp}`,
        slug: `e2e-org-${stamp}`,
      })
    ).json()
    const session = await (
      await api('POST', '/api/v1/auth/switch-org', founderToken, { orgId: org.id })
    ).json()
    const dept = await (
      await api('POST', `/api/v1/organizations/${org.id}/departments`, session.token, {
        name: `E2E Dept ${stamp}`,
      })
    ).json()
    const project = await (
      await api('POST', `/api/v1/departments/${dept.id}/projects`, session.token, {
        name: projectName,
      })
    ).json()

    // 3. Invite an employee into the department and assign the project.
    // The mock sub doubles as login name; the synthesized @mock.invalid
    // address matches the invite so it auto-accepts on login.
    const inviteEmail = `seconde2e${stamp}@mock.invalid`
    const inviteUsername = `seconde2e${stamp}`
    const inviteRes = await api('POST', `/api/v1/organizations/${org.id}/memberships/invite`, session.token, {
      email: inviteEmail,
      role: 'employee',
      departmentIds: [dept.id],
    })
    expect(inviteRes.status()).toBe(201)

    // 4. Employee login in a fresh context (invitation auto-accepts).
    const ctx2 = await browser.newContext()
    const employeePage = await ctx2.newPage()
    const employeeToken = await mockLogin(employeePage, inviteUsername)
    const api2 = apiFor(employeePage)

    // 5. Founder assigns the now-active membership to the project.
    const memberships: any[] = await (
      await api('GET', `/api/v1/organizations/${org.id}/memberships`, session.token)
    ).json()
    const employee = memberships.find((m) => m.email === inviteEmail)
    expect(employee?.id).toBeTruthy()
    const assignRes = await api(
      'POST',
      `/api/v1/projects/${project.id}/assignments`,
      session.token,
      { membershipId: employee.id },
    )
    expect(assignRes.status()).toBe(201)

    // 6. Timer: start → pause → resume → stop.
    // No reload: first visit mounts queries after the assignment exists.
    await employeePage.goto('/time-tracker')
    await expect(employeePage).not.toHaveURL(/\/login/, { timeout: 15_000 })
    await employeePage.getByLabel('Projeto').selectOption({ label: projectName })
    await employeePage.getByLabel('Observações').fill(description)
    await employeePage.getByRole('button', { name: 'Iniciar timer' }).click()
    await expect(employeePage.getByRole('button', { name: 'Pausar' })).toBeVisible({ timeout: 10_000 })
    await employeePage.getByRole('button', { name: 'Pausar' }).click()
    await expect(employeePage.getByRole('button', { name: 'Continuar' })).toBeVisible({ timeout: 10_000 })
    await employeePage.getByRole('button', { name: 'Continuar' }).click()
    await expect(employeePage.getByRole('button', { name: 'Pausar' })).toBeVisible({ timeout: 10_000 })
    await employeePage.getByRole('button', { name: 'Parar e salvar' }).click()
    await expect(employeePage.getByText('Tempo registrado')).toBeVisible({ timeout: 10_000 })

    // 7. Entry persisted server-side with our description.
    const monday = new Date()
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const entriesRes = await api2(
      'GET',
      `/api/v1/time-entries?from=${monday.toISOString()}&to=${sunday.toISOString()}&size=500`,
      employeeToken,
    )
    expect(entriesRes.status()).toBe(200)
    const entries = await entriesRes.json()
    expect((entries.content ?? entries).some((e: any) => e.description === description)).toBe(true)

    // 8. Timesheet grid renders the project row.
    await employeePage.goto('/timesheet')
    await expect(employeePage.getByText(projectName).first()).toBeVisible({ timeout: 10_000 })

    // 9. Reports table shows the entry description.
    await employeePage.goto('/reports')
    await expect(employeePage.getByText(description).first()).toBeVisible({ timeout: 15_000 })

    // 10. Employee opens the week and submits it through the period UI.
    await employeePage.goto('/timesheet')
    await employeePage.getByRole('button', { name: 'Abrir semana' }).click()
    await expect(employeePage.getByRole('button', { name: 'Enviar para aprovação' })).toBeVisible({ timeout: 10_000 })
    await employeePage.getByRole('button', { name: 'Enviar para aprovação' }).click()
    await expect(employeePage.getByText('Aguardando aprovação')).toBeVisible({ timeout: 10_000 })

    // 11. Founder approves through the approval-queue UI.
    await page.goto('/timesheet')
    await expect(page.getByText('Aprovações pendentes')).toBeVisible({ timeout: 15_000 })
    const approveButtons = page.getByRole('button', { name: 'Aprovar' })
    await expect(approveButtons.first()).toBeVisible({ timeout: 15_000 })
    await approveButtons.first().click()
    await expect(page.getByText('Nenhuma semana aguardando aprovação.')).toBeVisible({ timeout: 15_000 })
    await ctx2.close()
  })
})
