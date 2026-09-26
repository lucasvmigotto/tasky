# TaskY — Domain Model (as implemented)

> Status: Draft
>
> Reconstructed by project:introspec on 2026-09-26 from `dev` @ `044361d`.
> Structure follows `backend:domain`. Invariants cite the layer that
> enforces them (DB constraint, service rule, or both).

## Bounded contexts

| Context | Aggregates | Owner packages |
|---|---|---|
| Identity & Tenancy | User, Organization, OrganizationMembership, ManagerDepartment, DepartmentMemberType | `domain/user`, `domain/organization`, `domain/membership`, `domain/department`, `domain/membertype` |
| Access | RefreshSession (+family), SuperAdmin grant | `domain/session`, `security/SuperAdminService` |
| Org structure | Department, ProjectColumn | `domain/department`, `domain/projectcolumn` |
| Work | Project (+Assignment, CrossDeptAccess), Activity (+Dependency, Comment, Mention, Attachment, Checklist, Event) | `domain/project`, `domain/activity` |
| Demand | InternalRequest (+Comment, Sequence), ActivityTemplate (+Version, Recurrence, Occurrence) | `domain/request`, `domain/activitytemplate` |
| Time | TimeEntry, TimesheetPeriod | `domain/timeentry`, `domain/timesheet` |
| Planning | WorkSchedule (+Day, Placement), Holiday, LeavePeriod | `domain/capacity` |
| Insight | SavedReport, ReportExportJob (+read-model queries) | `domain/report` |
| Collaboration | Notification (+Preference), AuditEvent | `domain/notification`, `domain/audit` |
| Knowledge | Document (+Version, Attachment), StoredFile | `domain/document`, `domain/storage` |
| Platform | AppSetting | `domain/setting`, `domain/organization` |

## Aggregates, invariants, lifecycles

### Identity & Tenancy

- **Organization** (`organizations`): `name`, unique `slug`, `timezone`
  (IANA), `workWeekStartsOn` 1–7 [OBSERVED: `V1`, `V8__organization_timezone.sql:7`].
- **User** (`users`): unique `email/username/google_sub`, `isActive`
  [OBSERVED: `V1`]. Deactivation blocks refresh
  [OBSERVED: `RefreshSessionService.java:100-102` (rotate re-checks)].
- **OrganizationMembership**: `Role super_admin|admin|manager|employee`
  [OBSERVED: `Role.java:3-7`]; hierarchy `isAdminLevel/isManagerLevel`
  [OBSERVED: `Role.java:9-15`]; `is_active`, invitation lifecycle
  PENDING→ACCEPTED/REVOKED/EXPIRED [OBSERVED: `V23`, `V17`]; M:N member
  types [OBSERVED: `V36`]; cost rate, custom username, daily cap, timezone.
- **ManagerDepartment** (composite PK): manager↔department scope links
  [OBSERVED: `V1`, `membership/ManagerDepartment.java:20`].
- Invariants: last-admin removal blocked [INFERRED: `MembershipController`
  guards + `changeRole` admin-count check `MembershipService.java`;
  confirm exact rule text with a test run].

### Access

- **RefreshSession family**: `token_hash` UQ, `family_id`, sliding
  `expires_at` (14d), absolute `family_expires_at` (30d, V48), `revoked_at`,
  `replaced_by`, `@Version`
  [OBSERVED: `V5`, `V48__refresh_absolute_lifetime.sql`,
  `domain/session/RefreshSession.java:25-70`].
- Lifecycle: create → rotate* (same family, extends sliding only) →
  revoked; reuse of replaced token wipes family (strict, metric+alert);
  absolute expiry wipes family
  [OBSERVED: `RefreshSessionService.java:64-127`, 7 passing integration tests].
- Concurrency: `SELECT FOR UPDATE` + re-verify (check-lock-check); bulk
  wipe; wipe paths never hold row locks (self-deadlock fix)
  [OBSERVED: `RefreshSessionService.java:65-67,139`, `RefreshSessionRepository.java:17-31`].

### Work

- **Project**: dept-scoped, optional manager, color (hex CHECK), rates,
  estimates/budgets, `isActive`, `@Version`
  [OBSERVED: `V1`, `V32`, `V35`, `V43`, `Project.java:27-80`].
- **Activity**: Fibonacci weight CHECK [OBSERVED: `V1:123`], status
  TODO→IN_PROGRESS→IN_TESTING→DONE (+BLOCKED/CANCELED)
  [OBSERVED: `ActivityStatus.java:3`, `V42`], position ordering,
  taskType/priority/dueDate [OBSERVED: `V21`], parent (subtasks, depth ≤ 5)
  [OBSERVED: `V10`, `ActivityService` hierarchy helpers], `@Version`.
- **ActivityDependency**: parent↔child edges, same-project rule, cycle
  detection [OBSERVED: `ActivityDependencyService.java`].
- **Checklist/Comment/Mention/Attachment/Event**: comment soft-delete,
  mention cap 20/active-org/read-checked, attachment URL-or-stored-file,
  event types COMMENT_CREATED…DUE_DATE_CHANGED
  [OBSERVED: `ActivityCollaborationService.java`, `V11/V12/V25`].
- **ProjectColumn**: per-project ordered columns bound to lifecycle status
  (position + status UQ) [OBSERVED: `V39:26-30`].

### Time (strongest invariants — DB + service)

- **TimeEntry**: one running per membership (partial UQ)
  [OBSERVED: `V6`]; no overlap incl. running-as-infinity (EXCLUDE)
  [OBSERVED: `V44:10-13`]; `end>start`, `duration≥0` CHECKs [OBSERVED: `V3`];
  pause segments (`paused_seconds/paused_at`) [OBSERVED: `V7`]; billing/cost
  snapshots; GLPI ref ≤64 [OBSERVED: `V34`]; `@Version`
  [OBSERVED: `V43`, `TimeEntry.java:114-116`].
- Lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED, LOCKED terminal-ish
  [OBSERVED: `V13:22`]; edits blocked when submitted+ or in closed/locked
  period [OBSERVED: `TimeEntryService.requireEditable/requirePeriod…`];
  stop idempotent; project reassign refreshes billing snapshot + REASSIGN
  audit [OBSERVED: `TimeEntryService.java`].
- **TimesheetPeriod**: member-week UQ, range CHECK, APPROVED/LOCKED blocks
  entry edits, LOCKED→DRAFT reopen is admin-only + audited
  [OBSERVED: `V27`, `TimesheetPeriodService.java`].

### Planning

- Schedules with default partial-UQ, days (dow 1–7), member placements
  with **EXCLUDE** no-overlap, org holidays (UQ org+date), leaves with
  **EXCLUDE** no-overlap [OBSERVED: `V29:14,42-43,51,67-68`].

### Insight (read models + jobs)

- Reports are native aggregate queries (seconds-by-day/project/member,
  totals, distinct days, estimates) + in-Java week bucketing; summary
  cached 30s in Redis (tenant-scoped key), detailed paged, inline guarded
  at 2000 rows [OBSERVED: `ReportService.java`, `CacheConfig.java`].
- **SavedReport** (jsonb params, owner-or-admin) and **ReportExportJob**
  (PROCESSING→READY/FAILED, attempts/last_error, stored artifact, scope
  frozen in params) processed by single-node SKIP-LOCKED worker
  [OBSERVED: `V30`, `V45`, `ReportExportWorker.java:60-117`].

### Collaboration / Knowledge / Platform

- **Notification**: idempotent `event_key` partial-UQ; preferences gate
  mentions (`ACTIVITY_MENTION`) with default-allow
  [OBSERVED: `V24:4`, `V47`, `NotificationService.java`].
- Reminders fan out 4 types on a 60s scheduler with per-type isolation
  [OBSERVED: `ReminderScheduler.java:18-36`].
- **AuditEvent**: append-only enforced by DB trigger (no JPA guard)
  [OBSERVED: `V17:5-13`]; actor/tenant/resource/action/before/after/requestId.
- **Document/StoredFile**: versions, attachments, soft-delete; local dir or
  Azure by settings [OBSERVED: `V40/V41`, `FileStorageService.java:44-110`].
- **AppSetting**: GLOBAL/ORGANIZATION scopes, typed values, super-admin
  writes [OBSERVED: `V38`, `SettingsController.java:34-63`].

## Cross-cutting rules (observed)

- Tenant scoping: JWT `org_id` → `activeOrganizationId`; scoped finders
  (`…AndOrganizationId`, `…AndDepartment_Organization_Id`); path/org
  equality on `{orgId}` writes
  [OBSERVED: `DepartmentController.java:33-78`, `PermissionService.java`].
- Money: `NUMERIC`, revenue/cost computed with snapshots, margin derived
  [OBSERVED: `ReportService.java` financials].
- Soft-delete: comments, attachments, stored files, invitations (statuses);
  hard delete: projects, activities, members (audit trail keeps history).
- Time: `timestamptz` + UTC Hibernate; org/member IANA zones at the edges
  [OBSERVED: `application.yml:20-29`, `TimesheetPeriodService.zoneOf`].
