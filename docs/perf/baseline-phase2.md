# Phase 2 evidence — 2026-09-19

Branch: `feat/phase-2-data-integrity-concurrency`.

## Migrations on PG18.6 (dev DB, migrated V41 → V44 live)

- `V42 activity status in testing` — CHECK widened, no 500 on `IN_TESTING`.
- `V43 optimistic locking` — `version BIGINT NOT NULL DEFAULT 0` on
  `time_entries` + `projects`.
- `V44 time overlap exclude` — `no_time_overlap EXCLUDE USING gist
  (membership_id, tstzrange(start, COALESCE(end,'infinity')))`; applied in
  19ms; boot 8.8s; `/actuator/health` UP.
- Pre-migration overlap report: 0 entries, 0 overlapping pairs.

## Tests

- Backend full suite: **98 tests, 0 failures** (Java 25, Testcontainers PG18).
- New: version stale/match unit tests, pause-preservation unit test,
  `TimeEntryConcurrencyIntegrationTest` (3× parallel overlap → 1 win;
  2× parallel same-version update → 1 ok + 1 conflict).
- Frontend: `tsc` clean. Vitest shows 12 failures that are **identical on
  the clean Phase-1 tree** (apiClient 401/single-flight, authStore restore,
  AdminMembers, NotificationCenter, MySector) — pre-existing, triaged in
  Phase 5; none touch Phase 2 files.

## Semantics decided

- Running entry (`end_time NULL`) blocks overlapping manuals until stopped
  (matches long-standing app predicate).
- Abutting entries (`end == start`) allowed (range `[)` semantics).
- `stop` on already-stopped entry stays idempotent (no version bump conflict).
- `expectedVersion` omitted = unchecked (old clients keep working).
- Manual/update ignore pauses only when `pausedSeconds = 0`; otherwise the
  deduction is preserved via `effectiveElapsedSeconds`.
