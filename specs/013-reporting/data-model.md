# 013 — Data model

- `time_entries` (see 008): reporting reads genuine aggregates.
- `report_export_requests`: membership + org, format enum (CSV/XLSX/PDF),
  status PENDING→PROCESSING→COMPLETED/FAILED, blob path, error, audit
  metadata, version.
