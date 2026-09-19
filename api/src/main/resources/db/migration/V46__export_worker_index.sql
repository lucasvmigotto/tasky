-- PHASE 7 (T-IDX): partial index for the export worker's SKIP LOCKED poll.
-- EXPLAIN showed a sequential scan on report_export_jobs per 5s tick.
CREATE INDEX IF NOT EXISTS idx_export_jobs_processing_created
ON report_export_jobs (created_at)
WHERE status = 'PROCESSING';
