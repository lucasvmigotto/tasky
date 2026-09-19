-- PHASE 2 (T-09): optimistic locking for concurrent entry/project mutation.
ALTER TABLE time_entries
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
