---
name: tasky-backend
description: Use when creating, fixing, or improving features in the TaskY Java/Spring Boot backend (api/). Covers Spring Boot 4.0.6 modularity (Flyway autoconfig), multi-tenant domain model, JPA/Flyway schema flow, JWT + RBAC, controllers/DTOs pattern, tests with Testcontainers, and Docker commands. Trigger keywords: API, backend, endpoint, controller, service, repository, entity, Flyway, migration, JPA, JWT, RBAC, role, permission, POSTGRES.
---

# TaskY Backend

TaskY is a multi-tenant time-activities platform. The backend lives in `api/` (Java 21, Spring Boot 4.0.6, Gradle 8.14). Monorepo root Gradle: root `build.gradle` only declares plugin versions; `api/` is a subproject via `settings.gradle` (`include 'api'`).

## Architecture map

```
io.tasky.api
├── config/            AppConfig, TaskYProperties (@ConfigurationProperties)
├── security/          SecurityConfig, JwtAuthenticationFilter, JwtTokenProvider,
│                      GoogleTokenVerifier, PermissionService, SecurityUser
├── domain/            Entities + Services + Repositories, one package per aggregate:
│   organization/ department/ team/ user/ membership/ project/ label/ activity/
└── api/               REST controllers + request/response DTOs, one package per resource:
    auth/ organization/ department/ team/ membership/ project/ label/ activity/ common/
```

### Domain model (tenant boundary = Organization)

```
Organization
  └── Department
       ├── Team
       └── Project (managerMembership)
            ├── ProjectAssignment (project_id + membership_id)
            ├── CrossDepartmentProjectAccess
            └── Activity (weight Fibonacci 1/2/3/5/8/13, DAG deps)
                 ├── ActivityLabel
                 └── ActivityDependency (parent-child)
ManagerDepartment / LeaderTeam  → scoped management relations
```

- Roles (strict hierarchy): `admin` > `manager` > `leader` > `employee` (`domain/membership/Role.java`).
- O desenho pretendido centraliza acesso em `security/PermissionService.java`, mas o estado auditado usa checks manuais inconsistentes e praticamente não usa `@PreAuthorize`. Código novo deve combinar query tenant-aware, policy explícita e teste cross-tenant; nunca copiar o padrão inseguro de endpoint apenas autenticado.

## Critical technical facts (learned the hard way)

1. **Spring Boot 4.0.6 is modularized.** Flyway auto-config is NOT in `spring-boot-autoconfigure`. It ships in the `org.springframework.boot:spring-boot-flyway` module — the project must keep this dependency (already in `api/build.gradle`). Removing it silently disables Flyway.
2. **Flyway must be explicitly enabled.** `spring.flyway.enabled: true` is required in `application.yml`, `application-prod.yml`, and `application-dev.yml` (it was `false` upstream, which broke boot with `Schema validation: missing table [activities]`).
3. `spring.jpa.hibernate.ddl-auto: validate` — the schema comes ONLY from Flyway migrations in `src/main/resources/db/migration/`. Every new column/table needs a new `V{n}__name.sql`. Do not change applied migration files — add a new one.
4. **JWT secret is base64-decoded** (`Base64.getDecoder().decode(...)` in `JwtTokenProvider`) e deve ter ao menos 32 bytes. O estado auditado contém fallbacks conhecidos e refresh inseguro do próprio access token. Ao tocar auth, carregue `tasky-security-enterprise`; remova defaults, implemente sessão revogável e nunca copie segredo para código/teste/log.
5. Datasource envs: `POSTGRES_HOST/PORT/DB/USER/PASSWORD` (defaults localhost/5432/tasky). All timestamps are `TIMESTAMP WITH TIME ZONE`; Hibernate runs in UTC (`hibernate.jdbc.time_zone: UTC`).
6. Migrations use `gen_random_uuid()` (pgcrypto extension created in V1). Entities use `@GeneratedValue(strategy = GenerationType.UUID)`.
7. Swagger (springdoc): `/swagger-ui.html`, `/swagger-ui/**` e `/api-docs/**` estão permitidos no estado atual. Isso é aceitável localmente, mas deve ser restrito/desabilitado em produção pela TASK-007.
8. Composite-id embeddables (`ManagerDepartment$Id`, `LeaderTeam$Id`, `ActivityLabel`) não possuem `equals/hashCode`; isso afeta semântica de `Set` e não deve ser propagado.

## Layering conventions

- `Controller` (api/…): thin; maps DTOs, delegates to Service; annotations `@RestController`, `@RequestMapping("/api/v1/...")`.
- `Service` (domain/…): business logic + permission checks (via `PermissionService`), `@Transactional`, throws typed exceptions handled by `GlobalExceptionHandler`.
- `Repository` (domain/…): Spring Data JPA interface.
- DTOs: request/response records in the controller package. Response DTOs map entities → expose UUIDs/FKs (never the entity graph).
- Entity `@PrePersist/@PreUpdate` manage `createdAt`/`updatedAt`. `@Builder` + Lombok (`@Getter/@Setter/@NoArgsConstructor/@AllArgsConstructor`) is the house style.

## Env / config reference| Variable | Default | Notes |
|---|---|---|
| `POSTGRES_DB/USER` | `tasky` | |
| `POSTGRES_PASSWORD` | — | set in `.env` |
| `JWT_SECRET` | obrigatório, sem default em produção | base64 ≥256-bit |
| `JWT_EXPIRATION_HOURS` | 24 | |
| `GOOGLE_CLIENT_ID/SECRET` | — | only needed for real OAuth (demo mode skips it) |
| `APP_CORS_ALLOWED_ORIGINS` | `*` | |
| `SPRING_PROFILES_ACTIVE` | prod in compose | dev = show-sql + DEBUG + 168h tokens |

## Commands

```bash
# Build + tests (root, requires Java 21)
./gradlew :api:test
./gradlew :api:build

# Full stack (Docker)
docker compose up -d --build
docker compose logs -f api
docker compose down

# DB shell
docker exec -it tasky-db psql -U tasky -d tasky

# API / Swagger / health
# http://localhost:8080/swagger-ui.html  http://localhost:8080/api-docs
# http://localhost:8080/actuator/health
```

Tests use Testcontainers (PostgreSQL) — no external DB needed. The Docker build runs `./gradlew :api:build --no-daemon -x test` for speed; run tests explicitly before merging.

## Improvement playbook (backend)

When asked to improve/extend the backend:

1. Locate the resource package under `api/` + matching `domain/` package; read the existing controller/service/DTO to mirror its shape.
2. Data change → write `V{n}__short_name.sql` (idempotent, `IF NOT EXISTS`/`ON CONFLICT` where sensible) and leave `ddl-auto: validate` untouched. Run `docker compose up -d --build api` and confirm Flyway log shows `Migrating schema "public" to version "n"`.
3. Authz: enforce via `PermissionService` + method security, mas também inclua o tenant em toda query. A hierarquia de role não substitui escopo de departamento/equipe/projeto.
4. Add/update endpoint in Swagger + typed client: response records keep `types.ts` contract in sync (frontend contract tests rely on it).
5. Test: service unit tests (JUnit5 + Mockito) and a Testcontainers integration test hitting the controller for the new path.
6. Never log secrets; keep `JWT_SECRET` out of source (`.env` / compose env only).
7. Run `./gradlew :api:test` and `docker compose up -d --build api` to verify before finishing.

## F1/F2 additions (implemented)

### Time tracking (`/api/v1/time-entries`)
- Migration `V3__time_entries.sql` → `time_entries` (membership_id, organization_id, project_id?, activity_id?, description, start_time, end_time?, duration_seconds?, billable, timestamps; CHECK `end_time > start_time`).
- `domain/timeentry/` (TimeEntry, TimeEntryRepository, TimeEntryService) + `api/timeentry/`.
- Endpoints: `POST /time-entries` (start, org from JWT), `GET /time-entries?from&to&projectId&membershipId` (manager/admin can filter by other membership), `GET /time-entries/org` (manager/admin), `PATCH /{id}/stop`, `PUT /{id}`, `DELETE /{id}`. Users manage their own; scope is the JWT `org_id`.

### CRUD endpoints added
- Projects: `GET/PUT/DELETE /projects/{id}` (+ `GET /projects/{id}/assignments`). `PUT` supports `isActive`, name, description, managerMembershipId.
- Cross-dept access: `GET /projects/{id}/cross-department-access`, `DELETE /.../{departmentId}`; `POST` now passes the real `grantedBy` (was `null` → bug fixed).
- Activities: `PUT /activities/{id}` (title/description/weight/dates/assignee/labels). `GET /activities` is paginated (`page`, `size`, default 1000) and returns `PaginatedResponse<ActivityResponse>` — frontend `useActivityQuery` extracts `.content`.
- Departments/Teams: `PUT`/`DELETE` (`/departments/{deptId}` under org; `/teams/{teamId}` under dept). Labels: `PUT /labels/{id}`.
- Memberships: `DELETE /{membershipId}` (remove, blocks last admin) and `PATCH /{membershipId}/role`.
- `PermissionService.canManageProject(user, projectId)` added (admin of org OR manager of dept). Delete/assign/cross-dept/update-settings now enforce permissions.

### Bugs fixed in this work
- **Flyway enabled** + `spring-boot-flyway` dependency required on Spring Boot 4 (module split).
- **`LazyInitializationException`**: `OrganizationMembership.user` and `.organization` are now `FetchType.EAGER` (memberships list, auth org list, time-entry DTO mapping all needed it). Controllers that map lazy graphs (`ActivityController`, `TimeEntryController`, `CrossDepartmentAccessController`) are annotated `@Transactional`.
- **`CreateProjectRequest`**: `@NotBlank UUID` is invalid (`UnexpectedTypeException` 500) → `@NotNull`.
- **`GlobalExceptionHandler.handleGeneral`** now logs the exception (`log.error("Unhandled exception", ex)`) — it previously swallowed stack traces, making debugging impossible.
- `ProjectAssignment`/`CrossDepartmentProjectAccess` gained `@PrePersist` for their NOT NULL timestamp columns.

## F4 (Clockify — implemented)

- `GET /time-entries/running` → entrada com `endTime=null` do usuário (recuperar timer pendente).
- Migration `V4__clients_tags.sql`: `clients`, `projects.client_id` + `projects.hourly_rate`, `time_entry_tags`. `Client` entity/repo/service + `ClientController` (`/organizations/{orgId}/clients`; admin/manager). `Project.client`/`hourlyRate`; `TimeEntry.tags` (ElementCollection) + `billable` no create/update/response.
- Reports: `GET /reports/summary` com filtros `projectId`/`membershipId` + `billableHours`/`nonBillableHours`; `GET /reports/detailed?...`; `GET /reports/export?...` → CSV.
- `POST /auth/switch-org { orgId }` → valida membership e **re-emite JWT** com nova `org_id`/`role` (`SwitchOrgResponse { token, org }`).
- **Armadilha lazy em DTOs**: `entry.getTags()` retorna a coleção sem inicializar; o record guarda a referência e o Jackson serializa fora da tx → `LazyInitializationException`. Sempre **copie para `new ArrayList<>(...)`** no mapeamento (dentro da transação).
- **`SecurityUser` é um record** → `user.id()`/`user.email()`, não `getId()`.

## Known improvement candidates

- `ActivityDependency` DAG enforcement exists at DB level (`chk_no_self_dependency`); ensure app-level cycle detection in `ActivityService` covers indirect cycles.
- Composite-id embeddables missing `equals/hashCode` (HHH000038 warnings).
- `getActivitiesByDateRange` filters in memory (`findAll()`) — move to a Spring Data `@Query` with paging for scale.
- Reports/aggregation reais já existem, mas filtram/agregam parte dos dados em memória e têm riscos N+1; migrar para projections/agregações SQL com tenant e paginação.
- `GoogleTokenVerifier` accepts any valid Google ID token (no audience check against `GOOGLE_CLIENT_ID`).

## Execução do roadmap

Para `TASK-001` a `TASK-040`, carregue primeiro `tasky-roadmap-executor` e a skill especializada indicada. Segurança/tenant exigem `tasky-security-enterprise`; migrations/queries exigem `tasky-data-scale`; todo comportamento alterado exige `tasky-quality-gate`.
