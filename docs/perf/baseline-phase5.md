# Phase 5 evidence — 2026-09-19

Branch: `feat/phase-5-testing-pyramid`.

## T-RACE — parallel proof (not just sequential 409s)

- `TimeEntryConcurrencyIntegrationTest` (`ExecutorService` + `CountDownLatch`,
  shared Testcontainers PG18): 3× parallel overlapping manuals → exactly 1 win
  (10 rounds), 2× parallel same-version updates → 1 ok + 1 conflict,
  2× parallel stops → idempotent stopped state.
- Backend full suite: **107 tests, 0 failures**.

## T-TENANT — matrix completion

- Added: cross-org project GET, cross-org activity GET, report summary
  tenant scoping (no foreign rows), foreign `switch-org` with a live refresh
  session → denied. Existing: dept create/update/delete/list, memberships,
  projects list, no-token 401.

## T-E2E — Playwright

- `e2e/auth.spec.ts` (3 mode-aware specs) + `e2e/timesheet.spec.ts` (demo
  render, no-crash) green locally in applicable profiles; `app-ci` runs the
  demo-profile smoke. Authenticated timer/kanban flows still need mock-token
  automation (backlog, Phase 5 follow-up).

## T-K6 — load smoke

- `scripts/k6/smoke.js`: health + anonymous-denial + bogus-token checks,
  `checks == 1.0` and `p95 < 500ms` gates. Local run: 100% checks,
  p95 ~1–2ms. Authenticated 50 RPS mix deferred to Phase 7 seeding.

## T-CONTRACT — OpenAPI gate

- `scripts/check-openapi-contract.sh`: 6 covered DTO schemas
  (`TimeEntryResponse`, `UpdateTimeEntryRequest`, `ProjectResponse`,
  `UpdateProjectRequest`, `OidcAuthRequest`, `AuthResponse`) match
  `types.ts` — green locally; `quality.yml:contract-check` boots db+api
  and enforces it per run.

## Known test debt (unchanged, triaged here)

- Frontend vitest: 12 pre-existing failures on the clean tree
  (apiClient/authStore/AdminMembers/Notification/MySector).
