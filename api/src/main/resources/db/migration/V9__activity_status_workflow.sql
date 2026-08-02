ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE activities
    ADD CONSTRAINT chk_activities_status
    CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELED'));

UPDATE activities
SET status = CASE
    WHEN end_datetime < now() THEN 'DONE'
    WHEN start_datetime <= now() AND end_datetime >= now() THEN 'IN_PROGRESS'
    ELSE 'TODO'
END,
completed_at = CASE WHEN end_datetime < now() THEN end_datetime ELSE NULL END
WHERE status = 'TODO';

CREATE INDEX IF NOT EXISTS idx_activities_project_status_position
ON activities(project_id, status, position);
