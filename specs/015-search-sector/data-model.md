# 015 — Data model

- Read-only over 002/004/005/008/011 tables; no dedicated tables.
- Return shapes: `SearchResultDto` (entity slices + assigned-to-me flag),
  `SectorDashboardDto` (members/projects, arrivals, workload summaries,
  recent activities).
