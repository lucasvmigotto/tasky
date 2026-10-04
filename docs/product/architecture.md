# TaskY — Architecture (as-is)

> Status: Draft
>
> Reconstructed by project:introspec on 2026-09-26 from `dev` @ `044361d`.
> Review-mode only: topology, hosting, stack, data stores, integrations.
> No to-be. Evidence labels per claim.

## Topology

```
Browser (SPA, pt-BR)
  │  /api/* reverse-proxied, static assets cached
  ▼
Nginx (app image: :8080)
  │  proxy /api/* → API_UPSTREAM, 10r/s limit, security headers
  ▼
Spring Boot API (:8080, non-root appuser)
  ├── PostgreSQL 18 (system of record, Flyway V1–V48)
  ├── Redis 8 (report-summary cache 30s TTL, fail-open)
  ├── MinIO (S3-compatible dev storage) or Azure Blob (prod path)
  ├── Google / Microsoft Entra / mock-oauth2-server (OIDC issuers)
  └── OTLP endpoint (traces), Sentry (errors)
```

[OBSERVED: `docker-compose.yml:6-171`; `app/nginx.conf.template:61-72`;
`api/Dockerfile:13-33`; `app/Dockerfile:25-52`.]

Single dev-only Compose stack (`api, app, wal-init, db, redis,
mock-oauth2`) [OBSERVED: `docker-compose.yml:1-2`]. Production uses a
separate approach (out of scope of the file).

## Hosting

- Dev: Compose on one host; all images digest-pinned except locally built
  `api`/`app` [OBSERVED: `docker-compose.yml:84,93,122,137,156` digests].
- API image: `eclipse-temurin:25-jdk` builder → `:25-jre` runtime, non-root,
  curl healthcheck on `/actuator/health`, `/app/data` volume + `/tmp` tmpfs
  [OBSERVED: `api/Dockerfile:1-33`].
- App image: `oven/bun:1` build → `nginx:stable-alpine` runtime, runtime
  config rendered per deploy via envsubst, wget healthcheck
  [OBSERVED: `app/Dockerfile:1-52`, `app/40-tasky-runtime-config.sh:4-6`].
- CI: `api-ci` (test → tag → Hub+GHCR + SBOM/provenance + release),
  `app-ci` (lint + vitest-under-Node + Playwright smoke → images +
  release), `quality` (backend/frontend scans, gitleaks, CodeQL, Trivy,
  contract-check job booting the stack)
  [OBSERVED: `.github/workflows/api-ci.yml`, `app-ci.yml`, `quality.yml`].

## Stack

| Layer | Technology | Evidence |
|---|---|---|
| Backend language/build | Java 25 toolchain, Gradle 9.0.0 | [OBSERVED: `api/build.gradle:10-14`, `gradle/wrapper/gradle-wrapper.properties:4`] |
| Backend framework | Spring Boot 4.0.8, with Tomcat 11.0.25 and Jackson 3.1.7 pinned (web, data-jpa, security, oauth2-resource-server, validation, data-redis, actuator, flyway) | [OBSERVED: `build.gradle:1-14`, `api/build.gradle:21-36`] |
| AuthN/Z | Spring Security stateless JWT HS256 + OIDC verifiers + `PermissionService(@Component("access"))` | [OBSERVED: `api/src/main/java/io/tasky/api/security/`] |
| Persistence | Spring Data JPA, Hibernate, Flyway, PostgreSQL 18 | [OBSERVED: `application.yml:7-31`, migrations V1–V48] |
| Cache | Spring Cache + Redis (JSON values, 30s TTL, fail-open handler) | [OBSERVED: `api/src/main/java/io/tasky/api/config/CacheConfig.java`] |
| Observability | logback JSON(prod)/text(dev), MDC requestId/userId/orgId/durationMs, Micrometer Prometheus + 5 domain counters, OTel bridge + OTLP env, Sentry (plain SDK, empty-DSN no-op) | [OBSERVED: `api/src/main/resources/logback-spring.xml`, `api/src/main/java/io/tasky/api/config/TaskyMetrics.java`, `SentryConfig.java`] |
| Frontend | React 19, TS 5.7, Vite 6, Tailwind 4, Radix ×18, TanStack Query 5.64, Zustand 5, Router 7, RHF+Zod, Recharts, Motion, dnd-kit, Sonner | [OBSERVED: `app/package.json:16-59`] |
| Frontend tests | Vitest 3 + jsdom + Testing Library + MSW 2 (absolute-URL handlers, shared server), Playwright 1.49 + axe | [OBSERVED: `app/vitest.config.ts`, `app/src/test/setup.ts`, `app/playwright.config.ts`] |
| Backend tests | JUnit 5 + Mockito + AssertJ + Testcontainers (PG digest-pinned) + Jayway JsonPath | [OBSERVED: `api/build.gradle:47-54`, `api/src/test/.../BaseIntegrationTest.java`] |

## API style

REST under `/api/v1`, 24 controllers, ~155 route mappings (full list in
`docs/product/introspec.md` appendix)
[OBSERVED: backend inventory]. Conventions observed:

- `ProblemDetail` errors with `code` + `traceId` (`requestId` MDC), no
  stack leaks [OBSERVED: `api/.../common/GlobalExceptionHandler.java`].
- Paged lists (`page`/`size`, server caps 500; reports inline cap 2000 →
  `USE_DETAILED_PAGE`) [OBSERVED: `api/.../report/ReportController.java:81-88`].
- Optimistic locking via `@Version` + optional `expectedVersion` → 409
  [OBSERVED: `V43__optimistic_locking.sql`, 7 entities with `@Version`].
- Idempotency: notification `event_key` partial-UQ, export polling, timer
  stop idempotent [OBSERVED: `V24__notification_event_inbox.sql:4`].

## Data stores

| Store | Role | Evidence |
|---|---|---|
| PostgreSQL 18 | System of record (48 migrations, pgcrypto + btree_gist, 3 EXCLUDE constraints, append-only audit trigger) | [OBSERVED: `api/src/main/resources/db/migration/V*.sql`, data inventory] |
| Redis 8 | Report-summary cache only (30s TTL, tenant-scoped keys); health excluded (fail-open) | [OBSERVED: `CacheConfig.java`, `application.yml:45-48`] |
| MinIO / Azure Blob | Attachment/export artifacts via `FileStorageService` (local fallback `./data/uploads`) | [OBSERVED: `domain/storage/FileStorageService.java:44-110`] |
| Browser | In-memory access JWT; HttpOnly `tasky_refresh` cookie; sessionStorage OIDC/PKCE one-time values | [OBSERVED: `AuthController.java:265-283`, `app/src/core/auth/oidc.ts`] |

## Integrations

| Integration | Direction | Selected by (names only) |
|---|---|---|
| Google OIDC (`tokeninfo`) | inbound auth | `GOOGLE_CLIENT_ID` [OBSERVED: `GoogleTokenVerifier.java:16,59-62`] |
| Microsoft Entra v2.0 JWKS | inbound auth | `MICROSOFT_CLIENT_ID`, `MICROSOFT_TENANT_ID` [OBSERVED: `MicrosoftTokenVerifier.java:32-40`] |
| mock-oauth2-server (dev) | inbound auth | `MOCK_OAUTH2_ENABLED`, `MOCK_OAUTH2_*_ISSUER/_JWKS_URI` [OBSERVED: `MockOidcTokenVerifier.java:27-40`, `docker-compose.yml:155-163`] |
| Sentry | outbound errors | `SENTRY_DSN` (FE runtime + BE) [OBSERVED: `application.yml:59-62`] |
| OTLP collector | outbound traces | `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SAMPLING_PROBABILITY` [OBSERVED: `application.yml:52-57`] |
| Azure Blob | outbound storage | `AZURE_STORAGE_CONNECTION_STRING` via settings key [OBSERVED: `FileStorageService.java:46-50`] |
| SMTP/mail, Kafka/RabbitMQ, Stripe/payments, LDAP | — | none observed (no such deps/routes) |

## Capacity (observed only; no load-test results in repo)

- k6 unauthenticated smoke exists (`50 RPS` stages in `scripts/k6/smoke.js`
  per prior evidence; script present [OBSERVED: `scripts/k6/smoke.js`]).
- Page caps (500), export async worker (single-node, SKIP LOCKED),
  summary cache, composite/range indexes (V15/V31) are the scaling
  mechanisms [OBSERVED: code as cited].
- [ASSUMPTION: current scale target is internal teams (tens–hundreds of
  users); confirm before capacity planning.]

## ADRs (existing, code-explained)

Decisions already recorded in `docs/adr/001–006` (modular monolith,
HS256+family, time invariants, brokerless exports, cache/storage, dev
platform). Introspec adds no new ADRs; drift and gaps are in
`docs/product/introspec.md`.
