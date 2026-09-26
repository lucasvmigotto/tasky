# 013 — Plan (as-is)

- Backend: `ReportService` (genuine GROUP BY native queries —
  `findAggregated...` in `TimeEntryRepository`), no in-memory fold for
  money columns; `ReportExportWorker` async CSV/XLSX/PDF (worker 500ms
  test pace); fail-open Redis optional.
- Frontend: `ReportsPage` (lazy recharts, 4 tabs, summary/grouped/detail/
  export), SSE streaming hook with polling fallback, `exportCsv` download.
- Data: `time_entries` (+EXCLUDE on tstzrange), `report_export_requests`.
