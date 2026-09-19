# Phase 0 baseline — 2026-09-19

Branch: `feat/phase-0-discovery-dev-platform`. Commit SHA recorded in git log.
Counts replace the stale `docs/ROADMAP_STATUS.md` figures (80 tests / 23 migrations / 2026-08-01).

## 1. Census

| Item | Count | Source |
|---|---|---|
| Flyway migrations | 41 (`V1`–`V41`) | `api/src/main/resources/db/migration/V*.sql` |
| Backend test classes | 20 | `find api/src/test -name '*Test.java'` |
| Frontend test files | 13 | `find app/src -name '*.test.*'` |
| `@RestController` controllers | 24 | `grep -rl @RestController api/...` (excl. `GlobalExceptionHandler` advice) |
| Route mappings | 155 | `grep -cE @(Get\|Post\|Put\|Patch\|Delete)Mapping` per controller |

### Routes per controller (Phase 1 tenant-matrix input)

| Controller | Routes |
|---|---:|
| ActivityController | 22 |
| CapacityController | 17 |
| ReportController | 16 |
| InternalRequestController | 15 |
| TimeEntryController | 14 |
| DocumentController | 11 |
| TimesheetController | 8 |
| MembershipController | 7 |
| NotificationController | 6 |
| ProjectController | 5 |
| ProjectColumnController | 5 |
| AuthController | 5 |
| SettingsController | 4 |
| MemberTypeController | 4 |
| DepartmentController | 4 |
| ProjectAssignmentController | 3 |
| CrossDepartmentAccessController | 3 |
| FileController | 3 |
| ActivityTemplateController | 3 |
| SectorOverviewController | 1 |
| SearchController | 1 |
| PrivacyController | 1 |
| OrganizationController | 1 |
| AuditController | 1 |

## 2. Dev stack verification (fresh volumes)

| Service | Image | Evidence |
|---|---|---|
| db | `postgres:18-alpine` | `SHOW server_version()` → `18.6`, healthcheck healthy |
| redis | `redis:8-alpine` | `redis-cli ping` → `PONG`, healthy |
| minio | `quay.io/minio/minio:latest` | `/minio/health/live` → 200, healthy |
| mock-oauth2 | `ghcr.io/navikt/mock-oauth2-server:latest` | both `/.well-known/openid-configuration` return issuers for `tasky-google-mock` + `tasky-microsoft-mock` |

Notes:
- PG16→18 required fresh `pgdata` (approved) AND the PG18 mount convention `pgdata:/var/lib/postgresql` (parent dir, keeps `pg_upgrade` path open for PG19).
- `minio/minio` on Docker Hub is gone → `quay.io/minio/minio`.
- Mock issuers seen from host are `http://127.0.0.1:48080/<tenant>`; from inside the compose network they are `http://mock-oauth2:8080/<tenant>` (compose env uses the internal form — Phase 1 backend validates against env-configured issuers).
- Validate file: `docker compose --env-file /tmp/opencode/phase0.env config --quiet` → OK (JWT test secret lives only in `/tmp`, never in repo).

## 3. Config table (timeouts/TTLs/limits)

| Setting | Value | Source |
|---|---|---|
| Java toolchain | 25 (Gradle wrapper 9.0.0) | `api/build.gradle`, `gradle-wrapper.properties` |
| JWT TTL | 24h prod compose default / 168h dev profile | `application.yml`, `application-dev.yml` |
| Google tokeninfo timeout | 5s connect + 5s read | `GoogleTokenVerifier.java` |
| Frontend lazy retry | 15s race + 1 retry | `app/src/app/router.tsx` (`lazyWithRetry`) |
| Nginx rate limit | 10 r/s burst 30 | `app/nginx.conf` |
| CORS | explicit origins only (prod fail-fast) | TASK-007, already Concluída |

## 4. Query-plan baseline

Deferred to Phase 0 follow-up: seed 100k `time_entries` fixture (local only, `/tmp/opencode`) and run `EXPLAIN (ANALYZE, BUFFERS)` on report aggregates + feed author joins before Phase 7 index work. Top suspects (from `analysis.md`): 8-query `ReportService.buildSummary` fan-out, unbounded `GET /reports/detailed`, comment/feed N+1, `findByAssignedToId` minutes query.

## 5. P0 pointer (Phase 1 scope)

Per `analysis/analysis.md §27`: dept write tenant-confusion, `deleteEntry` lock bypass, `IN_TESTING` vs V9 CHECK, create-activity read gate, checklist read gate, side-effecting `GET /reports/exports`. Plus generic OIDC (Google + Microsoft via mock) and ArchUnit tenant gate.

## 6. Decisions parked

- PG19: idea only — PG18 mount layout already `pg_upgrade`-friendly; runbook stub lands in Phase 9.
- Mongo/NoSQL: deferred — Postgres JSONB + Redis cache + MinIO cover Phase 0–7 needs; revisit trigger recorded in Phase 7 ADR.
- Real Google/Microsoft client IDs: none available — mock-only until Phase 1 needs real ones.
