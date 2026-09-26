# Phase 4 evidence — 2026-09-19

Branch: `feat/phase-4-frontend-architecture`.

## T-17 — OrgContext removed

`app/src/core/org/OrgContext.ts` deleted (zero consumers verified by grep);
`authStore.activeOrg` is the single org source. Empty `core/org/` dir removed.

## OIDC frontend + export POST

- Runtime config carries `MICROSOFT_CLIENT_ID`, `MOCK_OAUTH2_ENABLED/URL`
  end-to-end: `.env` → compose → nginx entrypoint → `runtime-config.js`
  (verified live: app serves all 5 keys, HTTP 200).
- `core/auth/oidc.ts`: Microsoft (Entra `common` v2 authorize) + dual mock
  tenants, `sessionStorage` provider tag, `/auth/oidc` exchange, callback.
  `authStore.loginWithOidc`; restore tries OIDC before legacy Google.
- LoginPage: Microsoft button (when configured) + mock section (local only).
- `useCreateReportExportJob` POSTs; MSW mirrors POST (legacy GET kept).
- App image rebuilds green with `manualChunks` (charts/motion split).

## T-31 — paging hygiene + async states

- `clampPageSize` in activities/time-entries/org/detailed/requests hooks
  (max 200–500); `size=5000` eliminated (Reports/Calendar → 500);
  `placeholderData: keepPreviousData` on paged lists.
- AdminProjectsPage wrapped in `QueryState` (loading/error/empty).
- Real per-page pagination UI + server caps deferred to Phase 7 (callers
  still rely on full-list semantics; truncating defaults now would lose data).

## T-34 / T-18a — bundle, redirect, E2E

- `charts-*` (434KB) and `motion-*` chunks split from index (478KB —
  route-level recharts lazy is Phase 7 work; budget not yet met, tracked).
- LoginPage honors `location.state.from` (was dropped); demo login too.
- Playwright: 3 mode-aware specs green locally in both profiles
  (non-demo: redirect + mock buttons; demo: deep-link + login bounce);
  `app-ci` runs the demo-profile smoke.

## Tests

- `tsc` clean. Vitest: 33 passed / 12 failed — the 12 are byte-identical
  pre-existing failures on the clean tree (Phase 5 triage); +3 new OIDC tests.
- Backend untouched this phase (102 green carried over).
