# TaskY RBAC matrix

Source of truth: `PermissionService` (`@Component("access")`) + controller
`@PreAuthorize`/manual guards + tenant-scoped repositories. Frontend
`permissions.ts` is UX-only and never authoritative. Roles form a strict
hierarchy `super_admin > admin > manager > employee` (`Role.java`).

Conventions: every `{orgId}` path is checked against the JWT
`activeOrganizationId` (Phase 1 T-01 pattern); every tenant-owned lookup
uses a scoped finder (Phase 1 T-07/T-08). Negative tests live in
`TenantIsolationIntegrationTest`, `MembershipScopeIntegrationTest`,
`TimeEntryIntegrityIntegrationTest`, `AuthFlowIntegrationTest`.

## Organization / membership

| Capability | super_admin | admin | manager | employee | Endpoint / service / test |
|---|---|---|---|---|---|
| Create organization (becomes admin) | Y | Y | Y | Y | `POST /organizations` / `OrganizationService` |
| Manage org, departments, roles | Y | Y | — | — | `DepartmentController` (`canManageOrganization` + same-org guard) / `TenantIsolationIntegrationTest.orgB_cannotCreateDepartment_inOrgA` |
| Invite employee (scoped) | Y | Y | Y | — | `MembershipController.invite` (`canInviteRole`) / `MembershipScopeIntegrationTest` |
| Invite manager/admin | Y | Y | — | — | same as above |
| Change role / remove member | Y | Y | — | — | `PATCH .../role`, `DELETE .../memberships/{id}` (last-admin block) |
| Read own membership | Y | Y | Y | Y | `GET /memberships` (scoped) |

## Projects / activities

| Capability | super_admin | admin | manager | employee | Endpoint / service / test |
|---|---|---|---|---|---|
| Create project (managed depts) | Y | Y | Y | — | `POST /departments/{id}/projects` (`canCreateProject`) |
| Manage project | Y | Y | Y (managed) | — | `PUT/DELETE /projects/{id}` (`canManageProject`); scoped finds (`ProjectService`) |
| Read project | Y | Y | scoped+assigned+cross | assigned/created | `GET /projects/{id}` (`canReadProject`); `TenantIsolationIntegrationTest.orgB_cannotGetProject_ofOrgA` |
| Assign / grant cross-dept | Y | Y | Y (managed) | — | assignment + cross-dept controllers (org threaded server-side, Phase 1) |
| Create activity | Y | Y | Y (managed project or creator) | creator only | `POST .../activities` (`canManageProject`, Phase 1 T-04) |
| Manage activity / checklist | Y | Y | Y (managed/creator) | creator only | `canManageActivity` (Phase 1 T-05 for checklist) |
| Read activity | Y | Y | scoped | assigned/created | `canReadActivity`; `TenantIsolationIntegrationTest.orgB_cannotGetActivity_ofOrgA` |

## Time

| Capability | super_admin | admin | manager | employee | Endpoint / service / test |
|---|---|---|---|---|---|
| Own timer/manual entries | Y | Y | Y | Y | `TimeEntryService` (ownership + overlap + version + period locks) |
| View org entries | Y | Y | scoped reports | self only | `GET /time-entries/org` (Phase 7: max 500) |
| Submit own | Y | Y | Y | Y | `PATCH .../submit` (period lock enforced) |
| Approve/reject | Y | Y | scoped approver | — | `PATCH .../approve|reject` (atomic scoped finds, Phase 1) |
| Delete | Y | Y (own DRAFT) | own DRAFT | own DRAFT | `requireEditable` + period lock (Phase 1 T-02; SUBMITTED+ → 409) |
| Timesheet submit/reopen own | Y | Y | Y | Y (self) | `TimesheetController` (`canSubmitTimesheet`) |
| Timesheet batch approve/reject/close | Y | Y | scoped approver | — | `POST /timesheets/periods/approve|reject|close` (`TimesheetPeriodIntegrationTest`) |
| Reopen LOCKED (audited exception) | Y | Y | — | — | `REOPEN_LOCKED` audit (Phase 8) |

## Reports / exports

| Capability | super_admin | admin | manager | employee | Endpoint / service / test |
|---|---|---|---|---|---|
| Summary/detailed/workload/financials | Y | Y | managed-dept rows | self rows | `ReportController` (`canViewFinancialReports` + `scopedMembershipIds`); summary cached 30s (Phase 7) |
| Export jobs | Y | Y | managed-dept scope | self scope | `POST /reports/exports` → worker → download; scope frozen in params |
| Saved reports | Y | Y (owner-or-admin) | owner | owner | `SavedReportService` |

## Platform

| Capability | super_admin | admin | manager | employee | Notes |
|---|---|---|---|---|---|
| Global settings | Y | — | — | — | `SuperAdminService` (promote-only via `TASKY_SUPER_ADMINS`) |
| Switch org | member-only | member-only | member-only | member-only | membership revalidated; foreign switch denied (`switchToForeignOrg_denied`) |
| Audit viewer | Y | Y | — | — | append-only (`trg_audit_events_immutable`) |

## Rules for new endpoints (PR checklist)

1. Derive `orgId` from `SecurityUser.activeOrganizationId()`, never from the client alone; reject path/org mismatch.
2. Put the check in `PermissionService` (or reuse) + `@PreAuthorize` where the controller style allows; re-check ownership in the service.
3. Use scoped repository finders (`...AndOrganizationId`, `...AndDepartment_Organization_Id`); no bare `findById`/`getReferenceById` on tenant paths (`TenantArchitectureTest` fails the build otherwise).
4. Add a negative test: cross-tenant → 4xx with no data leak; wrong role → 403/404.
5. No new `@Transactional` on controllers (same test enforces).
