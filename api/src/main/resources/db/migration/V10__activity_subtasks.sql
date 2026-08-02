ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS parent_activity_id UUID REFERENCES activities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activities_parent_activity_id
ON activities(parent_activity_id);

ALTER TABLE activities
    ADD CONSTRAINT chk_activities_not_own_parent
    CHECK (parent_activity_id IS NULL OR parent_activity_id <> id);
