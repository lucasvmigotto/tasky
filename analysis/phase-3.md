# PHASE 3 — Backend Architecture

> Goal: pay down God-service / N+1 / transaction-hygiene debt without behavior
> change. Size: M (2–3 weeks).

## 1. Objectives

- Remove controller-level `@Transactional` (keep service boundaries explicit).
- Split `ActivityService` (1169L) into Core / Dependency / Collaboration.
- Replace fragile `getReferenceById`/`findById` patterns with scoped finds.
- Fix comment/feed N+1 with batch fetching; fix minutes query.

## 2. Tasks

### T-14 — Remove controller `@Transactional` (P1 / S)

- Problem: `TimeEntryController` + `ReportController` class-level
  `@Transactional` nests service txs, hides read/write intent, risks long
  export txs. Evidence: controller annotations vs service `@Transactional`.
- Desired: delete controller annotation; annotate service reads
  `@Transactional(readOnly = true)` (`getRunningEntry`, `getPage`,
  report builders); keep writes default. Export `create` must not hold tx
  across CSV build (see PHASE 7 — here just un-nest).
- Affected: 2 controllers + service annotations. DB: none. FE: none.
- Pitfalls: lazy associations serialized after tx (skill pitfall #3/#7) —
  preempt by copying collections to `new ArrayList<>(...)` in tx (existing
  pattern) + run full integration suite; `getRunningEntry` currently read-write
  — mark readOnly.
- Tests: full backend suite + lazy-init regression (no
  `LazyInitializationException` in CI).
- Acceptance: same responses, shorter tx spans (verify via logs).
- DoD: `rg "@Transactional" api/.../api/` returns only justified cases
  (documented).
- Deps: PHASE 1 merged.

### T-15 — Split ActivityService (P1 / L)

- Problem: 1169L God service (CRUD + move/reorder + deps + subtasks + comments
  + feed + mentions + attachments + checklist + minutes).
- Desired: `ActivityCoreService` (CRUD/move/reorder/subtasks/status),
  `ActivityDependencyService` (DAG + advisory lock + cycle check),
  `ActivityCollaborationService` (comments/feed/mentions/attachments/checklist),
  shared `ActivityMapper`/`ActivityAccess` helpers. Facade `ActivityService`
  delegates for one release (keep controller imports stable), then rewire.
- Affected BE: `domain/activity/*` only. DB/API/FE: none.
- Approach: pure move-method refactor, no logic change; keep `@Transactional`
  at new service level; add ArchUnit: `domain.activity.*` sub-packages may not
  import each other except via facade.
- Pitfalls: `@PreAuthorize` SpEL references service beans — keep bean names
  stable; advisory-lock method stays in dependency service.
- Tests: existing 6 unit + checklist/feed integration unchanged (move with
  class); add package-cycle ArchUnit test.
- Acceptance: suite green, file sizes <500L each, no public API change.
- DoD: ArchUnit + coverage unchanged.
- Deps: none (parallelizable with T-14).

### T-16 — Feed/comment N+1 + minutes query (P1 / M)

- Problem: `getCommentResponses/getFeedResponses/mentionsByComment` dereference
  `author.user.displayName` per row without `JOIN FETCH`/`EntityGraph`;
  `getTotalActivityMinutesForDate` loads `findByAssignedToId` fully in memory
  (UTC hardcode — fixed in PHASE 2, here the fetching).
- Desired: `JOIN FETCH author.user` (or batch `findAuthorsByCommentIds`) +
  query-count assertion test (`assertNumQueries ≤ N` via datasource proxy or
  Hibernate stats); minutes → range `@Query`
  `WHERE assignee=:m AND start < :dayEnd AND (end IS NULL OR end > :dayStart)`.
- Affected BE: repositories + service mappers. DB: add covering index if
  EXPLAIN warrants (`activity_comments(activity_id, created_at)` exists V11 —
  verify). FE: none.
- Pitfalls: EAGER `membership.user` already joins — avoid cartesian explosion
  (fetch one collection at a time, keep `toResponses` 3-query batch pattern
  `693-712`).
- Tests: 100-comment fixture → query count ≤ 5 (was ~100+); minutes spanning
  midnight covered.
- Acceptance + DoD: counts asserted in CI; p95 feed latency improved or flat.
- Deps: PHASE 2 zone decision.

### T-07/T-08 carry (if not done in PHASE 1)

Atomic time-entry finds + project scoped finds — same spec as PHASE 1; must
land before PHASE 5 race suite.

## 3. DB/API/FE changes

None (pure backend refactor + query indexes only if EXPLAIN-proven).

## 4. Risks + Rollback

Refactor-only; rollback = revert. Risk: SpEL bean rename — mitigated by facade.
Risk: fetch-join cartesian — mitigated by batch + count tests.

## 5. Definition of Done

- Controller tx gone; service split + ArchUnit green; N+1 counts asserted.
- Full backend suite green; no API/FE change; TASK-030 evidence updated.
