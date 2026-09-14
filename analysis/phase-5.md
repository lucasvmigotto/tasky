# PHASE 5 — Testing

> Goal: pyramid that proves tenancy, auth, races, and critical flows — no
> false confidence. Size: M (2 weeks, overlaps PHASE 2/4).

## 1. Objectives

- 70% unit (pure rules), 20% integration (tenant/auth/race/constraints), 10%
  E2E (critical flows) + k6 smoke.
- Every tenant-sensitive query has a negative test; every race-prone mutation
  has a parallel test; every new report query honors scope.
- Kill MSW-only contract drift (codegen check `types.ts` vs OpenAPI).

## 2. Tasks

### T-RACE — Parallel race suite (P1 / M)

- Scope: same-member parallel `start` × 5 → exactly 1×201 + 4×409 (DB partial
  UQ + advisory); parallel overlapping `manual` × 3 → 1×201 + 2×409 (app +
  EXCLUDE after PHASE 2); parallel `stop` × 2 → same-result idempotent (no
  500); parallel `update` same `expectedVersion` → 1 ok + 1 409.
- Harness: JUnit 5 `ExecutorService` + `CountDownLatch(start)` +
  shared Testcontainers DB (existing `BaseIntegrationTest`); 50 iterations,
  flaky threshold <1%; distinct `X-Request-Id` per thread (MDC isolation).
- Affected BE: `src/test/.../api/TimeEntryRaceIntegrationTest.java` (new).
  FE/DB: none (uses V6/V44 constraints).
- Pitfalls: advisory `xact_lock` serializes — test asserts outcome, not
  parallelism degree; avoid wall-clock flakes (`Instant.now` ordering —
  assert set membership, not order).
- Acceptance: outcomes exact; no 500; no overlaps in DB after run
  (`SELECT count(*) overlapping` zero).
- DoD: green in CI 3 consecutive runs.
- Deps: PHASE 2 version/EXCLUDE.

### T-TENANT — Tenant matrix completion (P1 / M)

- Scope: per T0-04 inventory, each resource: cross-org GET/PATCH/DELETE/POST-FK
  → 404/403 + no data leak (assert body has no foreign fields); own → 2xx;
  `membershipId`/`projectId` filter escape (employee passes чужой id →
  scoped to self or 403/empty, never leak).
- New files: extend `TenantIsolationIntegrationTest` + per-domain
  (`ProjectTenantTest`, `ReportScopeTest` asserting every native query takes
  `:scopeMembershipIds` — grep + test).
- Pitfalls: 404 vs 403 must not oracle existence — assert uniform shape
  (ProblemDetail code, no reason-string diff); timing check from PHASE 0.
- Acceptance: 100% routes in matrix have tests.
- DoD: TASK-003/026 evidence updated.
- Deps: PHASE 1.

### T-E2E — Playwright critical flows (P1 / M)

- Flows (from PHASE 4 smoke, extended): timer reload resume (`GET /running`
  after reload shows ticker); timesheet submit → approve → locked-edit 409;
  Kanban real drag (mouse + keyboard) + reload persists; reports filtered CSV
  matches detailed rows; org-switch isolation.
- Harness: Playwright + unique org/user per worker (parallel safe); API seed;
  `storageState` per role (admin/manager/employee).
- Affected: `app/e2e/*`, CI job, test seed endpoint (guard `!prod` or
  admin-only ephemeral — prefer API calls with real auth, no backdoor).
- Pitfalls: Google OAuth in CI — use `DEMO_MODE=false` + programmatic
  `POST /auth/google` with stubbed verifier? No — use refresh-session seed via
  test-only user factory behind `spring.profiles.active=test` (never prod).
- Acceptance: 8–10 specs green, <10 min, traces on fail.
- DoD: required check; TASK-027 evidence.
- Deps: PHASE 4.

### T-K6 — Load smoke (P2 / S)

- k6: 50 RPS mixed 5 min (reads/writes/summary) p95 <500ms, 0 5xx; soak
  monthly manual (200 RPS + 1M fixture) p95 <800ms. Script in `scripts/k6/`,
  CI nightly (not per-PR).
- Acceptance: thresholds green on staging-like data.
- DoD: dashboard screenshot + thresholds in repo.

### T-CONTRACT — OpenAPI ↔ types check (P2 / S)

- Generate `openapi.json` in CI (`springdoc`), diff `app/src/core/api/types.ts`
  key shapes via codegen (`openapi-typescript`) — fail on drift for
  auth/time/activity/report DTOs. MSW stays test-double, not contract source.
- Acceptance: drift PR fails with diff.
- DoD: TASK-039 evidence.

## 3. Risks + Rollback

Test-only additions; no prod risk. Flaky-race risk mitigated by outcome (not
timing) assertions + rerun policy.

## 4. Definition of Done

- Race + tenant + E2E + k6 + contract all green; TASK-026/027 updated;
  coverage of critical paths (auth/tenant/timer/approval/export) 100% by flow,
  not line %.
