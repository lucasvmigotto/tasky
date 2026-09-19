-- PHASE 7 (T-EXP): async export worker bookkeeping.
ALTER TABLE report_export_jobs
    ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_error TEXT,
    ADD COLUMN IF NOT EXISTS stored_file_id UUID REFERENCES stored_files (id);
