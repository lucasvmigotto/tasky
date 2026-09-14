# PHASE 1 — Security and Tenant Isolation

> Goal: close all P0 security/tenancy holes and lock the pattern with tests +
> static rules. Size: S–M (1–2 weeks). Blocks all feature work.

## 1. Objectives

- Fix 6 P0 items (TD-01, TD-04, TD-05, TD-02, TD-03, TD-06).
- Harden fragile scoped-find patterns (TD-10, TD-11).
- Prove tenant isolation per resource with negative integration tests.
- Add ArchUnit gate so new endpoints cannot regress.

## 2. Tasks

### T-01 — Dept write tenant-confusion (P0 / XS)

- Problem: `DepartmentController.create/update/delete` accept path `{orgId}`
  gated only by `canManageOrganization(user, pathOrg)`. A user admin in Org A +
  member in Org B (active) can mutate A without switching JWT org.
  Evidence: `api/department/DepartmentController.java` (no
  `orgId.equals(requiredOrgId)` on writes; list has it).
- Current: path org trusted. Desired: `if (!orgId.equals(requiredOrgId(user)))
  throw new SecurityException(...)` before service call (same as
  `MembershipController`, `ProjectController.listByOrganization`).
- Rationale: auth context (`activeOrganizationId`) must equal target tenant;
  least surprise + audit consistency.
- Affected BE: `DepartmentController` (3 methods) + helper `requiredOrgId`.
  FE: none. DB: none. Infra: none.
- Approach: add guard + unit-test helper; keep `canManageOrganization` check.
- Pitfalls: do not break org-creation flow (no org yet) — untouched controller.
- Tests: `DepartmentTenantConfusionIntegrationTest`: admin-A/member-B tries
  `POST /organizations/{A}/departments` with active B → 403; switch to A → 201;
  update/delete same matrix.
- Acceptance: cross-org write 403, same-org 2xx, list unchanged.
- DoD: tests green + ArchUnit covers `{orgId}` writes.
- Deps: T0-04 matrix.

### T-02 — `deleteEntry` approval/period lock (P0 / XS)

- Problem: `TimeEntryService.deleteEntry:285-288` deletes without
  `requireEditable` or period check — SUBMITTED/APPROVED entries deletable.
  Evidence: `deleteEntry` vs `updateEntry` (has `requireEditable`).
- Current: any owned entry deletable. Desired: call `requireEditable(entry)` +
  `requirePeriodNotClosedOrLocked(...)` (wire dead helper `290-300` or inline
  timesheet-period check) → 409 on locked.
- Affected BE: `TimeEntryService` only. DB: none (uses existing
  `timesheet_periods`).
- Approach: add 2 lines + import; decide LOCKED semantics (reuse
  `ConflictException` → 409 via handler).
- Pitfalls: frontend TimesheetPage may rely on delete-always — update its error
  copy to explain 409 + offer "reopen request" path (no logic change).
- Tests: delete DRAFT → 204; SUBMITTED → 409; APPROVED → 409; period
  APPROVED/LOCKED → 409.
- Acceptance: matrix above; no regression on own DRAFT delete.
- DoD: tests + UX string pt-BR.
- Deps: none.

### T-03 — `IN_TESTING` vs DB CHECK (P0 / XS)

- Problem: `ActivityStatus.java` includes `IN_TESTING`; V9 CHECK allows only
  TODO/IN_PROGRESS/DONE/BLOCKED/CANCELED → flush of IN_TESTING violates DB.
  Evidence: enum vs `V9__activity_status_workflow.sql`.
- Current: app allows value DB rejects (500 on flush). Desired: new migration
  `V42__activity_status_in_testing.sql` altering CHECK to include IN_TESTING
  (preferred — UI already models it in `types.ts`) OR remove enum value
  everywhere (larger blast radius).
- Affected BE: enum (no change) + migration. FE: `types.ts` already has it —
  no change. DB: additive CHECK replace (drop constraint + re-add, or
  `ALTER ... USING` safe rewrite).
- Approach: inspect V9 constraint name; write V42 dropping + re-adding with 6
  values; backfill none needed.
- Pitfalls: constraint name varies by PG naming — read V9 first; test on fresh
  + migrated-from-V41 DBs.
- Tests: persist + query IN_TESTING activity on both fresh and migrated DBs;
  invalid status still rejected.
- Acceptance: no 500; invalid → 400.
- DoD: Flyway validates V1–V42 clean.
- Deps: none.

### T-04 — Activity create gate read→manage (P0 / S)

- Problem: `ActivityController.create` checks `canReadProject` — any reader can
  create. Evidence: `create()` vs `update/move/delete` (use
  `canManageActivity`/`canManageProject`).
- Current: reader creates. Desired: require
  `@PreAuthorize("@access.canManageProject(...)")` or manual
  `canManageProject` throw (match file's manual style) — keep read for
  `listByProject/getById/query`.
- Affected BE: controller one method. FE: show 403 toast (already handled) +
  hide "Nova atividade" unless `canEditActivity` (UX-only, keep backend
  authoritative).
- Pitfalls: `ProjectActivitiesWorkspace` tests may assume creator — update MSW
  role to manager in tests.
- Tests: employee-assigned (read-only) POST → 403; manager → 201; admin → 201.
- Acceptance: matrix + no regression on list/get.
- DoD: tests + FE gate updated.
- Deps: none.

### T-05 — Checklist write gate (P0 / S)

- Problem: `addChecklistItem/toggle/deleteChecklistItem` check
  `canReadActivity` only — readers mutate. Evidence: controller checklist
  section (manual `canReadActivity` on writes).
- Current: read implies write. Desired: require `canManageActivity` on the
  three mutating routes; keep `canReadActivity` on list/get.
- Affected BE: controller 3 methods. FE: disable checklist editing unless
  `canEditActivity`.
- Pitfalls: `ActivityChecklistAggregateIntegrationTest` uses privileged user —
  add negative case with reader role.
- Tests: reader POST/PATCH/DELETE → 403; manager/creator → 2xx.
- Acceptance + DoD: as T-04.
- Deps: none.

### T-06 — POST exports, retire side-effect GET (P0 / S)

- Problem: `GET /reports/exports` creates a job (side-effect GET violates HTTP,
  caches/pre-fetchers can trigger jobs). Evidence: `ReportController`
  exports section.
- Current: GET creates. Desired: `POST /reports/exports` creates
  (body: same filters), returns `{jobId}`; keep `GET /exports/{jobId}` status +
  `GET /exports/{jobId}/download`; retain old GET as 308 → POST for one release
  with `Deprecation` header, then remove.
- Affected BE: controller + `ReportExportService` (no logic change) + OpenAPI.
  FE: `downloadExportJobCsv`/`downloadReportCsv` switch to POST; MSW handlers.
  DB: none.
- Approach: add POST, 308 shim, log deprecation; FE feature-flag not needed
  (atomic BE+FE release via Compose).
- Pitfalls: Nginx/CDN caching of old GET — add `Cache-Control: no-store` on
  shim; CSRF n/a (Bearer, no cookie auth).
- Tests: POST → 202 + jobId; old GET → 308; poll → READY; download CSV
  disposition + formula-prefix assertions (reuse `ReportServiceTest` logic).
- Acceptance: no GET side-effects in access logs; E2E download works.
- DoD: shim removal ticket filed for next release.
- Deps: none.

### T-07 — Atomic time-entry finds (P1 / S, include in PHASE 1)

- Replace `findById` + manual `equals` (`TimeEntryService:228,248,377`) with
  existing `findByOrganizationIdAndId`. Same behavior, no TOCTOU window.
- Tests: existing tenant tests + new cross-org approve/reject/update 404.

### T-08 — Project scoped finds (P1 / S, include)

- Replace `getReferenceById` (`ProjectService:39,144,165`) with
  `findByIdAndDepartment_Organization_Id` / scoped dept find. Tests: cross-org
  assign/grant 404.

### T-ARCH — ArchUnit + tenant matrix tests (P1 / S)

- Add `archunit` test dep; rules: (a) every `api.*Controller` write method has
  `@PreAuthorize("@access` or calls `requireActiveOrg`/`requiredOrgId`;
  (b) no `getReferenceById` in `domain/project`, `domain/timeentry`;
  (c) no new `@Transactional` on controllers.
- Extend `TenantIsolationIntegrationTest` per T0-04 matrix (each resource:
  cross-org GET/PATCH/DELETE/POST-FK → 404/403, own → 2xx).

## 3. Expected code areas

`api/.../api/department/`, `api/activity/`, `api/timeentry/`,
`api/report/`, `domain/timeentry/`, `domain/project/`, `security/`,
`src/test/.../api/*Tenant*`, `app/src/core/api/{hooks,msw}` (export caller).

## 4. DB/API/FE changes

DB: V42 only (T-03). API: POST exports + 308 shim (backward compat one
release). FE: export caller + hide-create/edit gates (UX only).

## 5. Risks + Rollback

Low blast radius, no data migration (except CHECK add — backward compatible).
Rollback: revert commit + redeploy prior `api-$V`; Flyway V42 is additive-safe
(check widen, no data loss).

## 6. Definition of Done

- 6 P0 + T-07/T-08 merged, ArchUnit green, tenant matrix 100% green.
- No new bare-`findById` on write paths (`rg` clean).
- `docs/ROADMAP_STATUS.md` TASK-003/TASK-006 updated to reflect inventory
  completion.
