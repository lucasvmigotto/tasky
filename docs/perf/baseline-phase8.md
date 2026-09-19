# Phase 8 evidence — 2026-09-19

Branch: `feat/phase-8-product-capabilities`.

## T-PAUSE — server reconcile

- Widget/page already issued pause/resume/stop immediately; added the
  missing half: `useRunningTimeEntry` polls every 10s while a local entry
  exists, and pure `reconcileTrackerState` converges pause/resume/stop and
  foreign-timer adoption (8 unit tests). Ticker stays display-only.
- MSW `/running` handler added.

## T-TS — timesheet batch + close

- Backend batch endpoints already existed (all-or-nothing per call —
  kept and documented over partial apply). Added the audited exception
  path: `LOCKED → DRAFT` reopen for org admins (`REOPEN_LOCKED` audit).
- `TimesheetPeriodIntegrationTest`: full lifecycle, batch approve ×3,
  closed-period entry edit → 409 (period locks enforced end-to-end).

## T-MENTION — prefs enforced

- New `ACTIVITY_MENTION` preference (V47 CHECK widen); `createOnce`
  overload gates on prefs (default allow); mention call site gated.
- Fixed `replace()` NPE on immutable maps (`containsValue(null)`).
- FE type + labels + defaults + MSW updated. Tests: pref-off suppresses,
  duplicates stored once.

## T-FIN — snapshot refresh

- `updateEntry` on project change refreshes `billingRateSnapshot` to the
  new project's rate (cost snapshot untouched), `REASSIGN` audit with
  old → new. Old rows keep their snapshot (prospective). Unit-tested.

## Migrations + tests

- V47 applied live on PG18 (now v47); boot green, health 200.
- Backend full suite: **115 green**. Frontend: `tsc` clean, 41 passed +
  12 pre-existing failures (unchanged set).
