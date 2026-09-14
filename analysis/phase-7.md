# PHASE 7 — Performance and Scalability

> Goal: hold p95 under growth (10k users / 1k orgs / M rows) with paging,
> async exports, and proven indexes — no new infra. Size: M (2 weeks).

## 1. Objectives

- Mandatory paging everywhere; persisted async export artifact (no 2x query).
- Batch remaining N+1; add only EXPLAIN-proven indexes.
- k6 budgets enforced in CI (smoke) + nightly soak.

## 2. Tasks

### T-13 — Page caps + detailed/page everywhere (P1 / S)

- Server caps: activities/time-entries/detailed-page `size 1..200 default 50`
  (time-org max 500 with justification); reject unbounded `GET /detailed` with
  400 + `Use detailed/page` (keep one-release 308 if clients exist — check FE
  callers first;T-31 already migrates FE).
- Affected BE: controllers/Pageable resolvers. FE: done in PHASE 4. DB: none.
- Tests: `size=5000` → 400; page walk stable (`ORDER BY start DESC, id DESC`
  keyset-compatible).
- Acceptance: no unbounded query reachable.
- DoD: caps documented in OpenAPI descriptions.
- Deps: PHASE 4 FE migration.

### T-EXP — Async export worker, no new infra (P1 / M)

- Problem: `ReportExportService.create` runs unbounded `getDetailed` + builds
  CSV then discards; `downloadCsv` re-queries (2x work inside tx).
- Desired: `POST /exports` persists `ReportExportJob(PROCESSING)` + enqueues
  row in same table; `@Scheduled` worker (single-node `ShedLock`-style via
  `pg_advisory_xact_lock(job_id)` — no Redis) picks oldest PROCESSING,
  streams query → object storage/local file (`stored_files`/`TASKY_UPLOAD_DIR`),
  marks READY with `blob_path` + expiry; `GET /{jobId}` polls; download serves
  file (range support later). `SavedReport` + `ReportExportJob` already have
  `@Version` — use for claim races.
- Affected BE: `ReportExportService` + scheduler + `FileStorageService`. FE:
  existing 4s poll already correct — keep. DB: add `attempts/last_error`
  columns (`V45__export_attempts.sql`).
- Approach: transitional dual-run (sync for <10k rows, async above) behind
  `tasky.exports.async-threshold`; then async-only.
- Pitfalls: tx across stream (use readOnly chunked `Slice`, not `List`);
  CSV formula-prefix must stay (`ReportServiceTest` logic reused in worker);
  expiry cleanup job.
- Tests: 100k-row export → READY <30s, single query pass (assert via stats),
  download byte-identical, expiry 404 after TTL.
- Acceptance: p95 summary unaffected during export (worker throttled).
- DoD: sync path removed (flag retired); TASK-024 evidence.
- Deps: PHASE 6 metrics (`export.duration`).

### T-IDX — EXPLAIN-driven indexes (P2 / S)

- From PHASE 0 plans: add only +20% wins (candidates: comment/feed author
  cover, `time_entries(org, member, start DESC, id DESC)` already V31 — verify;
  `activities(assignee, start)` for minutes). Each: migration + before/after
  plan in PR. No speculative indexes.
- Tests: plan assertion (Index Scan, buffers down).
- DoD: plans committed.

### T-FE-PERF — Frontend budgets (P2 / S, with PHASE 4)

- `size` budgets enforced, `keepPreviousData`, virtualize >200-row tables
  (TanStack Virtual — new dep justified by measured long lists), Recharts lazy.
- Acceptance: Lighthouse perf ≥85 on reports page with 1k rows paged.

## 3. Risks + Rollback

Worker lock contention — advisory per-job, idempotent re-run safe. Rollback:
threshold flag to sync path (kept one release).

## 4. Definition of Done

- No unbounded reads; export single-pass async; indexes proven; k6 smoke +
  soak budgets green; TASK-024/030 evidence.
