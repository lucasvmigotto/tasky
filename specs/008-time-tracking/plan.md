# 008 — Plan (as-is)

- Backend: `TimeEntryService` (locks, overlap, pause math, guards,
  snapshots) + atomic scoped finders + `initializeForResponse`
  (LazyInit-free controller mapping).
- Frontend: `TimeTrackerPage` (manual + timer), `TimeTrackerWidget`
  (global, reconcile), `timeTrackerStore` (ticker), 409 toast +
  refetch in `useUpdateTimeEntry`.
- Data: `time_entries` (V3, V6 partial UQ, V7 pause, V13 approval,
  V34 GLPI, V43 version, V44 EXCLUDE) + `TimesheetPeriod` interplay.
