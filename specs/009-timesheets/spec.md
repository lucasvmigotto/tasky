# 009 — Timesheets

> Status: Partial (backend Implemented + lifecycle tests; batch queue UI
> basic; no e2e).

## Stories

1. **Periods**: open own week, submit, reopen (rejected directly;
   LOCKED→DRAFT is admin-only + `REOPEN_LOCKED` audit).
   - Evidence [OBSERVED: `TimesheetController.java:31-64`,
     `TimesheetPeriodService.reopenPeriod`].
2. **Batch approve/reject/close**: all-or-nothing per call with per-item
   audit + notifications; approval queue for scoped approvers.
   - Evidence [OBSERVED: `TimesheetController.java:66-99`,
     `TimesheetPeriodIntegrationTest`].
3. **Locks**: APPROVED/LOCKED periods block entry edits (409 end-to-end).
   - Evidence [OBSERVED: `requirePeriodNotClosedOrLocked` test].

## Planned

- Batch queue UI (multi-select); partial-apply semantics decision record.
