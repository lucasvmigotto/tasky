# PHASE 8 — Product Capabilities (post-integrity)

> Goal: finish paused/partial product on top of hardened invariants. Only after
> PHASE 1–2. Size: M (3 weeks). No new infra.

## 1. Objectives

- Server-authoritative pause reconciliation (multi-device).
- Timesheet batch approve/reopen/close with audited exceptions.
- Mentions → notifications end-to-end; request→project conversion polish.
- Financial snapshots refreshed on reassignment (+ history when proven needed).

## 2. Tasks

### T-PAUSE — Server pause reconciliation (P1 / M, TASK-011 close)

- Problem: pause/resume client-ticker only; server entry stays running until
  stop (`end = start + elapsed` at stop) — second device sees running, not
  paused. Evidence: `timeTrackerStore` + `TimeEntry.pausedAt/pausedSeconds`
  (server fields exist, client doesn't drive them per-tick).
- Desired: widget pause → `PATCH /{id}/pause` immediately (already exists) +
  poll `/running` (10s while tracker open) to reconcile; stop computes from
  server pauses (already `effectiveElapsedSeconds`); conflict (edited elsewhere)
  → 409 reload copy. Keep client ticker for display smoothness between polls.
- Affected BE: none (endpoints exist; needs T-09 version). FE:
  `timeTrackerStore` (pause/resume call API, poll, reconcile) + MSW. DB: none.
- Pitfalls: offline pause (queue intent, reconcile on reconnect — document
  last-writer rule); double-pause idempotent (already).
- Tests: pause on tab A → tab B poll shows paused; stop deducts; E2E
  multi-context (two Playwright contexts, same user).
- Acceptance: no divergence >15s; duration math matches server.
- DoD: TASK-011 criteria evidenced.
- Deps: PHASE 2 version + PHASE 4 E2E harness.

### T-TS — Timesheet batch + close (P1 / M, TASK-022 close)

- Scope: `ApproveTimesheetPeriods/Reject/Close` batch endpoints (DTOs exist:
  `ApproveTimesheetPeriodsRequest` etc.) → service loops with per-item
  advisory lock + audit + notification; CLOSE sets LOCKED (wires PHASE 2
  enforcement); audited exception (reopen with reason → audit event).
- Affected BE: `TimesheetPeriodService` + controller + audit. FE: approvals
  queue batch select + reason dialog. DB: none (V27).
- Tests: batch 10 approve atomic-per-item (1 failure doesn't roll back 9 —
  document); closed-period edit → 409; reopen audit present.
- Acceptance + DoD: queue E2E green.
- Deps: PHASE 2 T-12.

### T-MENTION — Mentions → notify (P2 / S, TASK-017/036 slice)

- Wire `ActivityCommentMention` → `NotificationService.createOnce
  (event_key mention:{commentId}:{userId})` + prefs check
  (`NotificationPreference`) + unread-count; FE deep-link already
  (`NotificationCenter` safe-route test exists — extend).
- Tests: mention → inbox row; duplicate event → once; prefs-off → none.
- DoD: feed + inbox E2E.

### T-FIN — Snapshot refresh (P2 / S, TASK-021 slice)

- On `updateEntry` project change: refresh `billingRateSnapshot` to new
  project's rate (cost stays member's current) + audit old→new; history table
  only if finance disputes observed (defer).
- Tests: reassign → new snapshot; revenue report reflects new rate
  prospectively (old rows keep old snapshot — assert).
- DoD: documented immutability rule (§37-6).

## 3. DB/API/FE changes

API: batch timesheet (new POSTs, additive); pause polling uses existing GET.
DB: none (LOCKED uses existing status). FE: tracker reconcile + batch UI.

## 4. Risks + Rollback

Product-only; guarded by PHASE 2 locks (409s surface here — expected, with
copy). Rollback per-feature (tracker poll interval flag; batch endpoints
additive-safe).

## 5. Definition of Done

- Pause reconciles ≤15s; batch + close + reopen audited; mentions notify;
  snapshots refreshed; TASK-011/017/022/036 evidence updated; E2E extended.
