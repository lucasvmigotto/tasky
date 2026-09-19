-- PHASE 1 (T-03): align DB CHECK with ActivityStatus enum (IN_TESTING was missing).
ALTER TABLE activities
    DROP CONSTRAINT IF EXISTS chk_activities_status;

ALTER TABLE activities
    ADD CONSTRAINT chk_activities_status
    CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_TESTING', 'DONE', 'BLOCKED', 'CANCELED'));
