# 009 — Plan (as-is)

- Backend: `TimesheetPeriodService` (canonical week bounds, scoped
  approver checks, audit + notify per item).
- Frontend: `TimesheetPage` (weekly grid, manual CRUD, submit), approval
  queue hook (30s poll).
- Data: `timesheet_periods` (member-week UQ, range/status CHECKs,
  `@Version`) — V27.
