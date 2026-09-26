# 005 — Plan (as-is)

- Backend: `ActivityCoreService` (CRUD/move/reorder/page/mappers, 690L),
  `ActivityDependencyService` (117L), `ActivityEventHelper` (shared),
  stable `ActivityService` facade (40 delegates) for controllers/SpEL.
- Frontend: list/kanban/detail/timeline/calendar modules; `useMoveActivity`
  optimistic pattern; `size` clamp 500.
- Data: `activities` (V1, V9 status, V10 parent, V21 task fields, V28
  version+ordering, V39 request link, V42 IN_TESTING),
  `activity_dependencies`.
