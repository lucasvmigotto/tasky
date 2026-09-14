# PHASE 2 — Data Integrity and Concurrency

> Goal: move critical time/work invariants from convention to DB + tx
> guarantees, with parallel race proof. Size: M (2–3 weeks). Highest
> data-integrity leverage in the program.

## 1. Objectives

- Enforce single-running (already DB) + overlap (new EXCLUDE) + approval FSM +
  period locks at the lowest layer that can guarantee them.
- Add optimistic locking where lost-update is real (`TimeEntry`, `Project`).
- Fix pause-duration accounting and stale-snapshot drift.
- Prove with true parallel tests (`ExecutorService` + `CountDownLatch`), not
  sequential 409s.

## 2. Tasks

### T-09 — `@Version` on TimeEntry + Project (P1 / M)

- Problem: concurrent `stop/pause/resume/update` last-writer-wins; no version.
  Evidence: `TimeEntry.java` (no `@Version`) vs `Activity/Timesheet/SavedReport`
  (have it); stop/pause/resume take no advisory lock.
- Current: silent overwrite. Desired: `@Version long version` on both entities
  + migration (default 0) + `expectedVersion` optional field on
  `UpdateTimeEntryRequest`/`UpdateProjectRequest` (mirror `UpdateActivityRequest`
  pattern `ActivityService:368-371`): if present and mismatch → 409
  `ConflictException`; reorder-style blind bump forbidden — use JPA version.
- Affected BE: entities, DTOs, services. FE: send `expectedVersion` on edit
  forms (TimeTracker edit, project settings); on 409 show "modified elsewhere,
  reload" + refetch. DB: `V43__optimistic_locking.sql` adds `version BIGINT
  NOT NULL DEFAULT 0`.
- Approach: JPA `@Version` first; keep advisory lock for start/manual/update
  (serializes creation), version guards concurrent mutation.
- Pitfalls: native queries bypass version (`reassignPositions` pattern) — audit
  all `@Modifying` for version handling; MSW/old clients omitting version must
  still work (null = no check, documented).
- Tests: parallel `stop` × 2 → one wins, other 409 *or* idempotent-same-result
  (decide: stop is idempotent — second stop after first completes should return
  same entry, not 409; version conflict only on concurrent overlapping writes —
  encode this); parallel `update` with same `expectedVersion` → 1 ok + 1 409.
- Acceptance: no silent lost-update in race tests; sequential UX unchanged.
- DoD: race tests green 50/50 runs; docs note idempotent-stop semantics.
- Deps: T0-02 fixture.

### T-10 — Overlap EXCLUDE constraint (P1 / L)

- Problem: overlap app-only (`validateNoOverlap` + advisory lock). A missed
  caller or lock omission (`stop` extends time without recheck) can create
  overlaps. Evidence: `TimeEntryService` + `TimeEntryRepository.findOverlapping`
  + no EXCLUDE in V1–V41 (vs V29 EXCLUDE for schedules/leave — precedent).
- Current: convention. Desired: `ALTER TABLE time_entries ADD CONSTRAINT
  no_overlap EXCLUDE USING gist (membership_id WITH =, tstzrange(start_time,
  end_time) WITH &&)` — but `end_time` nullable (running) breaks range.
  Transitional: (a) policy flag `tasky.time.allow-overlap=false` default;
  (b) cleanup job reporting existing overlaps (read-only report first);
  (c) constraint on closed entries only via partial predicate is not expressible
  with EXCLUDE — options: (i) two-step: trigger/quarantine, or (ii) application
  + advisory + unique-quarantine table. Recommended: keep advisory + add
  **deferred-exclusion via `tstzrange(start, COALESCE(end, 'infinity'))`** with
  documented running-entry semantics (running blocks any later manual that
  touches infinity — matches current `findOverlapping` which includes running).
  Decide after overlap report: if running-infinity causes false blocks, use
  `COALESCE(end, start + interval '1 second')`? No — deliberate product
  decision required (see pitfalls).
- Affected BE: repository (catch `DataIntegrityViolation` → 409), service
  (keep app check for nice message). FE: surface 409 overlap resolver UI
  (already 409 path; improve copy). DB: `V44__time_overlap_exclude.sql`
  (+ `btree_gist` already installed V29 — reuse).
- Approach: report → quarantine (notify owners) → migrate → enable. Gate with
  `validateNoOverlap` staying as first-line UX.
- Pitfalls: touching-boundary semantics (`<`/`>` allow abut) must match
  `&&` (ranges `[)` — verify inclusivity; DST none (Instant); running-infinity
  may block far-future manuals — product must confirm "running blocks all
  future until stopped" (current behavior — keep).
- Tests: parallel overlapping manuals same member → 1×201 + N×409 (DB *and*
  app); abutting (end==start) → 201 both; running + manual overlap → 409.
- Acceptance: zero overlaps creatable via API under concurrency; abut allowed.
- DoD: EXCLUDE active on migrated + fresh DBs; overlap report zero.
- Deps: overlap report (new query) first; T-09 version.

### T-11 — Pause-aware duration on update (P1 / S)

- Problem: `updateEntry` recomputes `duration = between(start,end)` ignoring
  `pausedSeconds/pausedAt` — editing a paused entry wipes deduction. Evidence:
  `TimeEntryService.updateEntry:169-207` vs `stopEntry` (`effectiveElapsed...`).
- Current: pause lost on edit. Desired: reuse `effectiveElapsedSeconds(entry,
  end)` (refactor to accept override start/end) for recompute; persist
  `pausedSeconds` fold when `pausedAt != null` and end set.
- Affected BE: service one method + helper. FE: none (display already uses
  duration). DB: none.
- Pitfalls: manual entries have no pause (0) — unchanged; running entries
  (end null) keep null duration.
- Tests: paused entry edit description only → duration unchanged;
  edit end → duration = wall − pauses; unpaused edit → same as before.
- Acceptance + DoD: tests green; backfill not needed (durations recomputed
  lazily on next edit; document).
- Deps: none.

### T-12 — Wire period closed/locked enforcement (P1 / S)

- Problem: `requirePeriodNotClosedOrLocked` dead; LOCKED never assigned;
  submit/update/delete ignore timesheet periods. Evidence:
  `TimeEntryService:290-300` uncalled; `TimesheetPeriodService` exists.
- Current: periods advisory only. Desired: call check in
  `submit/update/delete/stop` (actor: entry's period containing `startTime`);
  define LOCKED assignment (on `timesheet approve/close`) — minimal: APPROVED
  period blocks edits (409) today; LOCKED wiring when close flow lands
  (PHASE 8).
- Affected BE: `TimeEntryService` (4 call sites) + `TimesheetPeriodService`
  (status lookup). FE: 409 copy "período fechado — solicite reabertura".
  DB: none (V27 exists).
- Pitfalls: performance (extra period lookup per mutation — indexed UQ, fine);
  grandfather existing SUBMITTED in closed periods (report-only, no retro-block
  without notice — document).
- Tests: entry in APPROVED period update/delete/stop → 409; DRAFT period → ok.
- Acceptance + DoD: tests + UX string.
- Deps: T-02 (delete path shares guard).

### T-13a — Timezone hardening (P1 / S, part of PHASE 2)

- `ReportService.buildSummary:53` `ZoneId.of(org.getTimezone())` throws on
  corrupt TZ — add fallback UTC + audit log + admin alert (mirror
  `TimesheetPeriodService.zoneOf` fallback).
- `getTotalActivityMinutesForDate` UTC-hardcode + in-memory + midnight-span
  exclusion → replace with scoped range `@Query` accepting zone + inclusive
  overlap predicate.
- Tests: corrupt org TZ → summary still 200; spanning-midnight activity counted
  in both days (or documented single-day rule — decide + test).

## 3. Expected code areas

`domain/timeentry/` (entity, service, repository), `domain/timesheet/`,
`domain/activity/` (minutes query), `domain/report/` (zone fallback),
`db/migration/V43+V44`, `api/timeentry/` DTOs, `app/.../TimeTracker*` (version
field + 409 copy).

## 4. DB/API/FE changes

DB: V43 (version cols), V44 (EXCLUDE, gated on cleanup). API: optional
`expectedVersion` (backward compat null = unchecked); 409 shapes unchanged.
FE: send version, 409 reload UX.

## 5. Risks + Rollback

EXCLUDE migration fails if overlaps exist — mitigated by report-quarantine
first; migration must be idempotent + validated on staging clone. Version cols
default 0 — rollback safe (drop cols forward-fix only). Advisory + version
interaction tested under concurrency before merge.

## 6. Definition of Done

- Parallel race suite (start/overlap/stop/update) green, flaky <1% over 50 runs.
- Zero overlaps creatable; abut allowed; idempotent-stop semantics documented.
- Period + approval locks enforced with 409 + UX copy.
- `ANALISE` TASK-008/009/011 criteria evidenced.
