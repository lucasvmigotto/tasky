# TaskY — Product Brief

> Status: Draft
>
> Reconstructed by project:introspec on 2026-09-26 from `dev` @ `044361d`.
> Every claim below carries an evidence label: [OBSERVED: path:line],
> [INFERRED: signal → conclusion], or [ASSUMPTION: …].

## Purpose

TaskY is a multi-tenant work + time management SaaS for internal teams,
combining Clockify-style time tracking with Asana-style project/activity
management in one product [INFERRED: `docs/ANALISE_TASKY.md:33` benchmark
framing + the fused domain model below; confirm target users].

[ASSUMPTION: the primary audience is internal company teams (Portuguese-
speaking, `pt-BR` UI throughout `app/`) needing billable-hours accounting,
timesheet approval and project oversight in one place.]

## Capabilities (observed)

- Organizations with departments, memberships and role hierarchy
  (`super_admin > admin > manager > employee`)
  [OBSERVED: `api/src/main/java/io/tasky/api/domain/membership/Role.java:3-7`].
- Projects with assignments, cross-department access, workflow columns,
  budgets and hourly rates
  [OBSERVED: `api/src/main/java/io/tasky/api/api/project/ProjectController.java:33-105`].
- Activities with status workflow, subtasks (depth ≤ 5), DAG dependencies
  with cycle detection, checklist, comments with mentions, attachments
  [OBSERVED: `api/src/main/java/io/tasky/api/api/activity/ActivityController.java:46-379`,
  `api/src/main/java/io/tasky/api/domain/activity/ActivityDependencyService.java`].
- Time tracking: start/pause/resume/stop timer, manual entries, overlap
  exclusion at the database level, optimistic locking, approval workflow
  (DRAFT → SUBMITTED → APPROVED/REJECTED/LOCKED)
  [OBSERVED: `api/src/main/resources/db/migration/V44__time_overlap_exclude.sql:10-13`,
  `api/src/main/java/io/tasky/api/api/timeentry/TimeEntryController.java:41-238`].
- Timesheet periods with submit/approve/reject/close/reopen and an approval
  queue [OBSERVED: `api/src/main/java/io/tasky/api/api/timesheet/TimesheetController.java:31-99`].
- Reporting: summary, detailed (paged + guarded inline), workload,
  financials per project/member/activity/department, approval/billable
  groupings, saved reports, async export jobs (CSV/XLSX/PDF)
  [OBSERVED: `api/src/main/java/io/tasky/api/api/report/ReportController.java:45-302`].
- Capacity planning: work schedules, holidays, leave periods, member
  capacity views [OBSERVED: `api/src/main/java/io/tasky/api/api/capacity/CapacityController.java:33-152`].
- Internal-request (demand) hub convertible into projects/activities
  [OBSERVED: `api/src/main/java/io/tasky/api/api/request/InternalRequestController.java:46-225`].
- Documents with versions/attachments, file upload/download (local or Azure)
  [OBSERVED: `api/src/main/java/io/tasky/api/api/document/DocumentController.java:38-144`,
  `api/src/main/java/io/tasky/api/api/file/FileController.java:35-74`].
- Notifications inbox with preferences and scheduled reminders
  [OBSERVED: `api/src/main/java/io/tasky/api/api/notification/NotificationController.java:29-63`,
  `api/src/main/java/io/tasky/api/domain/notification/ReminderScheduler.java:18-19`].
- Append-only audit log, LGPD self-export, global/org settings, super-admin
  platform role [OBSERVED: `api/src/main/java/io/tasky/api/api/audit/AuditController.java:24`,
  `api/src/main/resources/db/migration/V17__membership_retention_audit_immutability.sql:5-13`].

## Non-goals (observed gaps)

- No native mobile/desktop apps; responsive SPA only
  [OBSERVED: `app/` is a Vite SPA; no mobile projects in repo].
- No real-time collaboration (polling: 10s tracker, 30s notifications,
  4s export jobs) [OBSERVED: `app/src/core/api/hooks/index.ts` intervals].
- No public API tokens product (auth-scoped `ApiKeyRequest/Response` DTOs
  exist but are unused) [OBSERVED: backend inventory §1.1].

## Glossary

| Term (use) | Definition | Not |
|---|---|---|
| Organization | Tenant boundary; owns departments, memberships, projects | company, workspace, account |
| Membership | A user's role-scoped belonging to one organization | user-role, access |
| Activity | Unit of work in a project, with status workflow | task, ticket, card |
| Time entry | One recorded work interval (timer or manual) | timesheet row, log |
| Timesheet period | A member's week submitted for approval | timesheet (as object) |
| Billable | Hours charged to a client (vs internal) | billed, invoiced |
| Mention | `@`-reference of a member inside a comment | tag, ping |
| Saved report | A stored report definition (filters + params) | preset, view |
| Export job | Async report artifact generation (CSV/XLSX/PDF) | download, file |
| GLPI ticket | External helpdesk reference attached to entries | chamado (in code use `glpiTicketId`) |
| Sector | Manager-visible department scope (`/me/sector`) | area, division |

## Constraints (observed)

- `ddl-auto: validate`; schema changes only via Flyway `V*__*.sql`
  [OBSERVED: `api/src/main/resources/application.yml:20`].
- JWT HS256 + opaque refresh families; Google/Microsoft/mock OIDC
  [OBSERVED: `api/src/main/java/io/tasky/api/security/`].
- Single dev-only compose; production uses a separate approach
  [OBSERVED: `docker-compose.yml:1-2`].
- pt-BR UI copy [OBSERVED: `app/src/modules/**/pages/*.tsx`].
