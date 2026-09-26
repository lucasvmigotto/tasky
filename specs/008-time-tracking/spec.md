# 008 — Time tracking

> Status: Partial (backend Implemented + parallel proofs; pause reconcile
> covered by unit tests only; no timer e2e).

## Stories

1. **Timer**: start (one running per member enforced by partial UQ +
   advisory lock + app check), pause/resume persisted server-side,
   idempotent stop computing pause-aware duration from server clock.
   - Evidence [OBSERVED: `V6`, `V7`, `TimeEntryService.startEntry/stopEntry`,
     `TimeEntryConcurrencyIntegrationTest`].
2. **Manual entries**: atomic start/end/duration with overlap rejection
   (app predicate + DB EXCLUDE, abutting allowed).
   - Evidence [OBSERVED: `TimeEntryService.manualEntry`, `V44:10-13`].
3. **Concurrency**: `expectedVersion` → 409; parallel overlapping manuals
   → exactly 1 win; parallel same-version updates → 1 ok + 1 conflict.
   - Evidence [OBSERVED: concurrency integration tests].
4. **Edit/delete guards**: submitted/approved/locked and closed-period
   entries reject mutation with 409.
   - Evidence [OBSERVED: `requireEditable`, `requirePeriodNotClosedOrLocked`].
5. **Reassign**: project change refreshes billing snapshot + REASSIGN audit;
   old rows keep snapshots (prospective).
   - Evidence [OBSERVED: `TimeEntryService.updateEntry`].
6. **Multi-device** (unit-tested): pure `reconcileTrackerState`
   (ignore/adopt/finished) + 10s `/running` poll; ticker display-only.
   - Evidence [OBSERVED: `app/src/core/tracker/timeTrackerStore.ts:105-128`,
     `TimeTrackerWidget.tsx`, 8 vitest cases].

## Planned

- Offline pause queue.

Note: E2E timer flow delivered as `app/e2e/timer.spec.ts`
(`test:e2e:timer`): mock-OIDC login as founder, seed org/depts/project,
invite employee (auto-accept), second-context login, timer
start→pause→resume→stop, timesheet row, reports description, period
submit. Period submit stays API-level — no submit UI exists.
