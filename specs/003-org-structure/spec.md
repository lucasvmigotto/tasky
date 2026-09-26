# 003 — Org structure (departments, member types)

> Status: Implemented (no dedicated e2e).

## Stories

1. **Departments**: org-scoped CRUD; path/org equality enforced on writes.
   - Evidence [OBSERVED: `DepartmentController.java:33-78`].
2. **Member types**: per-department named types (e.g. roles/functions),
   assigned M:N to memberships; admin dashboard shows placement.
   - Evidence [OBSERVED: `MemberTypeController.java:32-59`, `V33`, `V36`].
3. **Manager scope**: `manager_departments` links bound on role grant.
   - Evidence [OBSERVED: `MembershipService` placement, `ManagerDepartment.java:20`].

## Planned

- Department archive/merge; team-level grouping (removed in V37 — see
  drift note in `docs/product/introspec.md`).
