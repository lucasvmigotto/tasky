# 004 — Data model

- `projects`: dept FK, name/description/color, manager (nullable), rates,
  estimates/budgets, isActive, version.
- `project_assignments`: project + membership (+assignedAt).
- `cross_department_project_access`: project + department + granter.
- `project_columns`: project FK, name/position/color/lifecycle,
  UQ (project,position) + (project,lifecycle_status).
