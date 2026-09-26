# 008 — Data model

- `time_entries`: membership + org + optional project/activity,
  description, GLPI ref, start/end instants, duration, pause state,
  billable flag, approval FSM + submitter/approver metadata,
  billing/cost snapshots, version. Constraints: partial-UQ running,
  EXCLUDE overlap, end>start, duration≥0 CHECKs.
