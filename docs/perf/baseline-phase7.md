# Phase 7 evidence — 2026-09-19

Branch: `feat/phase-7-performance-scale`.

## T-13 — bounded reads

- `GET /detailed` pages internally (cap 2001) and returns 400
  `USE_DETAILED_PAGE` above 2000 rows; server Pageable caps 5000 → 500
  (activities, time-entries ×2); `spring.data.web.pageable` safety net
  (default 50 / max 500).
- Fixed a live bug: `useReportDetailed` read `.content` off the unbounded
  list endpoint (always `undefined`); it now reads `/detailed/page` with a
  truncation banner (`mostrando N de M`).
- Removed the dead `downloadReportCsv` (`GET /reports/export` never
  existed → CSV buttons always 404'd); export now drives the job API.

## Redis summary cache

- 30s TTL, tenant-scoped key (org + filters + sorted scope hash), JSON
  values with default typing (records aren't JDK-serializable),
  fail-open `CacheErrorHandler`. Detailed rows and CSV never cached.
- Proven by `ReportSummaryCacheIntegrationTest` (real Redis): repeat call
  skips the 8-query fan-out; only per-request authz queries remain.
- Health stays UP with Redis down (`management.health.redis.enabled:
  false` — cache monitored via metrics, not liveness).

## T-EXP — async worker

- `create()` persists PROCESSING fast; `ReportExportWorker` (`@Scheduled`
  5s, `FOR UPDATE SKIP LOCKED` claim) builds CSV once, stores via
  `FileStorageService` (local today, Azure when configured), marks READY
  (3 attempts, `last_error`); download serves the artifact (no double
  query); visibility scope frozen in job params; `text/csv` added to
  default MIME allowlist.
- Proven: `asyncWorker_completesJobAndServesDownload`
  (PROCESSING → READY → 200). Single-node safe; multi-node needs ShedLock.
- V45 (attempts/last_error/stored_file) + V46 (partial worker index)
  applied live on PG18; boot green, health 200.

## T-IDX — EXPLAIN

- Summary aggregate → `Index Scan idx_time_entries_org_project_start`;
  comments → bitmap on `idx_activity_comments_activity_created`;
  events feed index exists. Only added the worker's partial index —
  no speculative indexes.

## NoSQL decision (recorded)

- Mongo deferred again: JSONB params, Redis cache, MinIO-ready storage
  cover current needs. Revisit trigger: feed/audit EXPLAIN regression or
  export SLA breach — neither observed (k6 p95 ~1–2ms on smoke).

## Tests

- Backend full suite: **110 green**. Frontend untouched this phase.
