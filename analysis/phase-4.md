# PHASE 4 — Frontend Architecture

> Goal: single state ownership, uniform async UX, paged lists, smaller bundle,
> first real-browser proof. Size: M (2 weeks).

## 1. Objectives

- One owner per state (kill `OrgContext` duplication).
- Every server-read page uses `QueryState` (loading/error/empty-safe).
- No unbounded lists; charts/admin code-split; MSW test-only hygiene.
- Playwright smoke: login → timer → report; kanban; switch-org.

## 2. Tasks

### T-17 — Kill OrgContext duplication (P2 / S)

- Problem: `core/org/OrgContext.ts` (activeOrgId/DeptId/TeamId) duplicates
  `authStore.activeOrg`; largely unused — divergence risk. Evidence: store
  listing + selector usage (`authStore(s => s.activeOrg?.id)` dominant).
- Desired: migrate remaining consumers to `authStore.activeOrg` (+ local
  component state for dept/team filters where truly local); delete file;
  `rg OrgContext` zero.
- Affected FE: `core/org/`, consumers (DashboardLayout filters), tests. BE/DB:
  none.
- Pitfalls: dept/team filter may need URL persistence — use search params, not
  global store (keeps shareable links).
- Tests: existing suite + `rg` zero assertion; switch-org still clears cache
  (`resetTenantState` path).
- Acceptance: no behavior change except consistent org source.
- DoD: file deleted, CI green.
- Deps: none.

### T-31 — Uniform QueryState + paged lists (P1 / M)

- Problem: `QueryState` covers workspace + My Sector only (TASK-031 Parcial);
  `size up to 5000` + unbounded detailed risk freeze.
- Desired: wrap every `useQuery` page (activities, timesheet, reports,
  requests, sector, admin) with `QueryState`; enforce page caps (default 50,
  max 200; time-entries max 500) in hooks; use `detailed/page` everywhere
  (remove unbounded `detailed` caller).
- Affected FE: `modules/*` pages + `hooks/index.ts` caps + MSW. BE: none
  (caps already server-enforced — FE just stops requesting max).
- Pitfalls: broad-prefix invalidation flicker — keep, but add
  `placeholderData: keepPreviousData` on paged lists to avoid flash.
- Tests: Vitest per page (loading/error/empty) + MSW empty-page case.
- Acceptance: every page shows all three states; no `size=5000` call in code.
- DoD: audit checklist (page × state) committed.
- Deps: PHASE 1 export change (CSV button uses new POST).

### T-34 — Bundle + router hardening (P2 / S)

- Problem: ~545 kB initial (Recharts + admin eagerly loaded); 15s
  `lazyWithRetry` may flash on 3G.
- Desired: `React.lazy` split Recharts/admin/timeline; `bundle-budget`
  CI check (initial <350 kB gzip, warn >400); add skeleton for lazy timeout
  instead of bare error; verify `location.state.from` redirect consumed in
  `LoginPage` (fix if dropped).
- Affected FE: `router.tsx`, report/admin/timeline chunks, `vite.config`
  `manualChunks`. BE/DB: none.
- Pitfalls: chunk-hash + Nginx `immutable` already correct — keep; test
  deploy-chunk-miss path (`lazyWithRetry` reload once).
- Tests: build-size assertion; redirect test (protected → login → back).
- Acceptance + DoD: budget green, redirect works, no preload-loop.
- Deps: none.

### T-18a — Playwright smoke (P1 / M, first slice)

- Three specs (Chromium, CI): (1) login → start → pause → stop → timesheet
  shows entry → report CSV downloads; (2) kanban drag + keyboard move +
  reload persists; (3) switch-org isolates data (orgA item invisible in B).
- Infra: `playwright.config.ts` (baseURL dev compose), `app-ci`/`quality`
  job, trace-on-failure. Seeds via API (fresh org per run, teardown).
- Acceptance: 3 specs green headed + headless; traces attached on fail.
- DoD: required check on `main`.
- Deps: T-06 POST exports, T-31 paging.

## 3. DB/API changes

None (FE-only except export caller already in PHASE 1).

## 4. Risks + Rollback

FE-only; rollback = prior `app-$V`. Risk: chunk-split route miss — mitigated by
smoke + retry loader.

## 5. Definition of Done

- OrgContext gone; QueryState × paging audit green; bundle budget green;
  3 E2E specs green in CI; TASK-014/031 evidence updated.
