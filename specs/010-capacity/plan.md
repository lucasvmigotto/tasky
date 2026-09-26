# 010 — Plan (as-is)

- Backend: `CapacityService` (+ query repository), authz inside service.
- Frontend: `MySectorPage` (sector workload/queue), capacity members hook.
- Data: `work_schedules`, `work_schedule_days`, `membership_work_schedules`
  (+generated range + EXCLUDE), `organization_holidays`,
  `membership_leave_periods` (+EXCLUDE) — V29.
