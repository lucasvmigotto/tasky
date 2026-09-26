# 004 — Projects

> Status: Implemented (no dedicated e2e).

## Stories

1. **Project CRUD**: dept-scoped create, read-gated fetch, full update
   (rates, budgets, estimates, active flag) with optimistic locking,
   delete. - Evidence [OBSERVED: `ProjectController.java:33-105`,
     `ProjectService.java`, `@Version Project.java:80`].
2. **Assignments**: assign/unassign memberships (manage-gated).
   - Evidence [OBSERVED: `ProjectAssignmentController.java:32-61`].
3. **Cross-department access**: grant/revoke/list department grants.
   - Evidence [OBSERVED: `CrossDepartmentAccessController.java:33-75`].
4. **Workflow columns**: ordered, lifecycle-bound columns + reorder.
   - Evidence [OBSERVED: `ProjectColumnController.java:34-78`, `V39:26-30`].

## Planned

- Project archive vs delete semantics; portfolio views.
