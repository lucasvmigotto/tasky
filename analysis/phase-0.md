# PHASE 0 — Discovery / Validation

> Goal: replace estimates with measured baselines before changing code.
> Size: XS (2–4 days). No schema changes. No API changes.

## 1. Objectives

- Re-run and record true test/migration counts (roadmap cites 80/44 tests, 23
  migrations — code shows 41 migrations, 20 backend classes, 13 frontend files).
- Baseline performance of the 8-query `ReportService.buildSummary` fan-out,
  `GET /reports/detailed`, comment/feed endpoints via `EXPLAIN ANALYZE`.
- Verify runtime configs: Hikari/JPA timeouts, JWT TTLs (24h prod / 168h dev),
  Nginx rate-limit behavior, `location.state.from` post-login redirect, 15s
  `lazyWithRetry` UX on slow networks.
- Inventory every endpoint for tenant-scope (input to PHASE 1 ArchUnit rule).

## 2. Tasks

### T0-01 — Test & migration census (XS)

- Problem: docs stale; cannot gate progress on wrong numbers.
- Approach: `./gradlew :api:test` (record pass/fail + count), `cd app && bun run
  test` + `bun run build`, `ls api/src/main/resources/db/migration/V*.sql | wc`,
  `flyway info` against fresh DB.
- Affected: none (read-only).
- Pitfalls: Testcontainers needs Docker; Windows hosts lack Java/Bun — run via
  `docker compose` per skill.
- Tests: n/a (this is measurement).
- Acceptance: `docs/ROADMAP_STATUS.md` counts updated with date + commit SHA.
- DoD: census table committed.

### T0-02 — Query plan baseline (S)

- Problem: report/feed bottlenecks asserted without plans.
- Approach: seed 100k time_entries fixture (script, local only); run
  `EXPLAIN (ANALYZE, BUFFERS)` on `findSecondsByDay/Project/Member`,
  `findTotals`, `getDetailed`, `getCommentResponses` author join,
  `findByAssignedToId` minutes query. Record p50/p95 via k6 smoke (50 RPS
  mixed: list activities, start/stop timer, summary).
- Affected DB: read-only. Infra: local k6 container.
- Pitfalls: do not run k6 against prod; anonymize fixture.
- Tests: store plans under `docs/perf/baseline-YYYY-MM-DD.md`.
- Acceptance: top-3 slowest queries named with plan + rows + buffers.
- DoD: baseline doc + fixture script reproducible.

### T0-03 — Config & UX verification (XS)

- Problem: unverified timeouts, redirect, 404 timing oracle.
- Approach: read `application*.yml` (hikari `connection-timeout`,
  `max-lifetime`), `TaskYProperties` TTLs, `vite` timeout, Nginx
  `limit_req` dry-run (`ab`/`k6` burst 40); manually test login redirect
  (`/reports` → `/login` → back), 404 vs 403 timing for foreign IDs
  (10 samples each, compare mean).
- Affected: none.
- Tests: checklist results recorded.
- Acceptance: config table (timeout/TTL/limit/redirect/timing) in baseline doc.
- DoD: gaps filed as PHASE 1/4/6 tasks if out of bounds.

### T0-04 — Endpoint tenant inventory (S)

- Problem: TASK-003 has no full inventory.
- Approach: enumerate all `@RequestMapping` + method routes
  (`rg "@(Get|Post|Put|Patch|Delete)Mapping"`); for each record: org source
  (JWT/path), `@PreAuthorize` expression, repository scope pattern
  (`findById` vs `findByIdAndOrganizationId`), test exists? Output CSV +
  markdown matrix.
- Affected: docs only.
- Acceptance: matrix covers 100% routes, flags the 6 P0 + 4 fragile paths.
- DoD: matrix reviewed, drives PHASE 1 scope.

## 3. Dependencies

None. Blocks PHASE 1–7 scoping.

## 4. Risks + Rollback

Read-only; no rollback needed. Risk: fixture bloat — use disposable DB volume.

## 5. Definition of Done

- Baseline doc with counts, plans, configs, matrix committed.
- PHASE 1 task list confirmed against matrix (no surprise endpoints).
