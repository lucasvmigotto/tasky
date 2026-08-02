ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_activities_ordering
    ON activities (project_id, status, position, id);

CREATE INDEX IF NOT EXISTS idx_activities_hierarchy
    ON activities (project_id, parent_activity_id, position, id);
