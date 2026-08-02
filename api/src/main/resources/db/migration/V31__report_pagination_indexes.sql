-- Stage 10: pagination / report / scope indexes.
-- All are additive (IF NOT EXISTS); no existing index is dropped.

-- Time entries: self-scope and org report pagination ordered by start_time DESC, id DESC.
CREATE INDEX IF NOT EXISTS idx_time_entries_org_member_start
    ON time_entries (organization_id, membership_id, start_time DESC, id);

CREATE INDEX IF NOT EXISTS idx_time_entries_org_project_start
    ON time_entries (organization_id, project_id, start_time DESC, id);

CREATE INDEX IF NOT EXISTS idx_time_entries_org_activity_start
    ON time_entries (organization_id, activity_id, start_time);

-- Time entries: admin approval queue (SUBMITTED rows only).
CREATE INDEX IF NOT EXISTS idx_time_entries_org_submitted
    ON time_entries (organization_id, approval_status, submitted_at, membership_id)
    WHERE approval_status = 'SUBMITTED';

-- Activities: stable Kanban/ordering scans (already present since V28, kept declarative).
CREATE INDEX IF NOT EXISTS idx_activities_ordering
    ON activities (project_id, status, position, id);

-- Activities: assignee-scoped queue (sector queue, reminders).
CREATE INDEX IF NOT EXISTS idx_activities_assignee_status_due
    ON activities (assigned_to, status, due_date, id);

-- Activities: subtask hierarchy scans (already present since V28, kept declarative).
CREATE INDEX IF NOT EXISTS idx_activities_hierarchy
    ON activities (project_id, parent_activity_id, position, id);

-- Dependencies: child-first lookups (parentIds for a page of activities).
CREATE INDEX IF NOT EXISTS idx_activity_dependencies_child_parent
    ON activity_dependencies (child_activity_id, parent_activity_id);
