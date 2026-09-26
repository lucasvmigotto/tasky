# 013 — Reporting

> Status: Implemented (genuine SQL aggregation, N+1-free; no e2e).

## Stories

1. **Summary**: scoped totals (entries count, hours, billable) for member
   or whole org over ranges.
2. **Grouped analyses**: by project/daily/member/sector with money
   (billable + task rate + overhead + total) and CSV exports.
3. **Detailed rows**: member/project/activity/period/overlap flags with
   parameterized sorts, size ≤ 500, page metadata.
4. **Async exports**: queued CSV/XLSX/PDF jobs with tenant-scoped status
   polling and synchronous CSV inline mode.
   - Evidence (all) [OBSERVED: `ReportController.java:50-121`,
     `ReportService` 1087L, `ReportExportWorker.java`, `V15`, `V41`,
     `TimeEntryReportingIntegrationTest`].

## Planned

- Scheduled/delivered reports; chart-level drill-downs.
