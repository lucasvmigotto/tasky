# 004 — Plan (as-is)

- Backend: `ProjectService` (scoped finds, `expectedVersion` check),
  column service with default seeding.
- Frontend: `ProjectsPage` (cards + create), `ProjectDetailPage`
  (stats, workspace, members, templates, docs panels).
- Data: `projects` (V1, V32 color, V35 nullable manager, V43 version),
  `project_assignments`, `cross_department_project_access`, `project_columns` (V39).
