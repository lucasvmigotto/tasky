# Phase 3 evidence — 2026-09-19

Branch: `feat/phase-3-backend-architecture`.

## T-14 — controller transactions removed

- Stripped class-level `@Transactional` from all 7 controllers
  (InternalRequest, TimeEntry, Timesheet, ActivityTemplate, Report,
  CrossDepartmentAccess, Membership). Arch test now asserts zero.
- 3 lazy paths surfaced by the suite and fixed in services (no EAGER,
  no open-in-view): time-entry graph (`membership/user/project/activity/
  approvedBy`) and membership `memberTypes` are initialized in-tx via
  `initializeForResponse` before detached controller mapping.

## T-15 — ActivityService split (1169L → 4 files)

- `ActivityCoreService` 690L (CRUD/move/reorder/page/mappers),
  `ActivityCollaborationService` 457L (comments/feed/mentions/attachments/
  checklist), `ActivityDependencyService` 117L (DAG + advisory lock),
  `ActivityEventHelper` 56L (shared event/notify/labels),
  `ActivityService` 340L facade (40 delegates, stable bean for
  controllers/SpEL/tests).
- Pure move-method: full suite proves no behavior change.

## T-16 — feed/comment batching

- `findByActivityIdWithAuthor` and `findPageWithActor` (JOIN FETCH),
  replacing per-row lazy author loads; mentions were already batched.
- `ActivityFeedQueryCountIntegrationTest` (30-comment fixture,
  Hibernate statistics): comments ≤ 6 queries, feed ≤ 8 queries.

## Tests

- Backend full suite: **102 tests, 0 failures** (Java 25, PG18).
