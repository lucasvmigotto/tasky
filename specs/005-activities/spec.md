# 005 — Activities

> Status: Implemented (Kanban DnD covered by jsdom tests, not real-browser e2e).

## Stories

1. **Activity CRUD**: create (manage-gated on project), read, full update
   with `expectedVersion`, move (column or legacy status + position),
   bulk reorder, delete.
   - Evidence [OBSERVED: `ActivityController.java:46-199`,
     `ActivityCoreService.java`].
2. **Status workflow**: TODO/IN_PROGRESS/IN_TESTING/DONE/BLOCKED/CANCELED
   with DB CHECK parity (V42) and position ordering.
3. **Subtasks**: parent links, depth ≤ 5, hierarchy cycle guard.
   - Evidence [OBSERVED: `V10`, core hierarchy helpers].
4. **Dependencies**: DAG edges with advisory-lock + cycle detection,
   same-project rule.
   - Evidence [OBSERVED: `ActivityDependencyService.java:223-284`].
5. **Views**: paginated org query, Kanban (dnd-kit, optimistic + rollback),
   Gantt timeline, calendar merge.
   - Evidence [OBSERVED: `ActivitiesPage`, `ProjectActivitiesWorkspace`
     (kanban chunk), `TimelinePage`, `CalendarPage`].

## Planned

- Real-browser DnD audit; dependency visualization on timeline.
