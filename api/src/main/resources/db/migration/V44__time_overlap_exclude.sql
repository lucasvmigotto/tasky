-- PHASE 2 (T-10): database-level no-overlap guarantee for time entries.
-- Mirrors the application predicate (start < newEnd AND (end IS NULL OR end > newStart)):
-- running entries (end_time NULL) map to 'infinity', i.e. a running timer blocks
-- any later manual entry until stopped. Abutting entries (end == start) are allowed.
-- Pre-migration overlap report on dev: 0 overlapping pairs.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE time_entries
    ADD CONSTRAINT no_time_overlap
    EXCLUDE USING gist (
        membership_id WITH =,
        tstzrange(start_time, COALESCE(end_time, 'infinity'::timestamptz)) WITH &&
    );
