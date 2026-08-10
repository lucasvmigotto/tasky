CREATE INDEX IF NOT EXISTS idx_time_entries_org_member_range
ON time_entries(organization_id, membership_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_time_entries_org_project_range
ON time_entries(organization_id, project_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_activities_org_project_range
ON activities(project_id, start_datetime, end_datetime);

CREATE INDEX IF NOT EXISTS idx_projects_org_active
ON projects(department_id, is_active);
