# TaskY

TaskY is a multi-tenant work and time-management monorepo with a Java/Spring Boot API, React SPA, and PostgreSQL.

The project has substantial functionality, but it is not yet validated as enterprise-ready. See `docs/ROADMAP_STATUS.md` for evidence-based status and known gaps.

## Stack

- API: Java 21, Spring Boot 4.0.6, Spring Security, JPA, Flyway, PostgreSQL 16.
- App: React 19, TypeScript, Vite 6, TanStack Query, Zustand, Tailwind 4, Radix UI.
- Runtime: public `eclipse-temurin`, `oven/bun`, `nginx`, and `postgres` images.
- Tests: JUnit/Testcontainers and Vitest/Testing Library/MSW.

The Dockerfiles do not use `dhi.io`, FIPS images, or a private base-image registry. Image vulnerability scanning is configured in the quality workflow, but a green scan run is required before release.

## Quick Start

Requirements: Docker with Compose and, for real login, a Google OAuth client ID.

```bash
cp .env.example .env
# Generate JWT_SECRET with: openssl rand -base64 32
# Set Google OAuth and database values in .env.
docker compose up -d --build
```

Local endpoints:

- App: `http://localhost:5173`
- API: `http://localhost:8080`
- Swagger: `http://localhost:8080/swagger-ui.html` when enabled by the active profile
- Health: `http://localhost:8080/actuator/health`

Local Compose binds the app and API to `127.0.0.1` by default. `docker-compose.production.yml` is a separate baseline that publishes only the app/Nginx service; it does not directly publish the API or PostgreSQL:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

This production baseline does not provide TLS, a secret manager, monitoring, external backups, or an ingress. Those must be supplied by the deployment platform.

## Authentication And Tenancy

- Google ID tokens are exchanged at `POST /api/v1/auth/google`.
- The short-lived access JWT is kept in browser memory and sent as `Authorization: Bearer`.
- Refresh uses a rotating `tasky_refresh` HttpOnly cookie. It is `Secure` in the `prod` profile and `SameSite=Lax`; the refresh token is not sent as an expired bearer token.
- The client sends cookie credentials, performs one single-flight refresh, and retries an unauthorized request at most once.
- The active organization is represented by the authenticated session/JWT. The client does not use an `X-Org-Id` header as an authorization boundary.
- A `429` is surfaced as an API error; the client does not promise automatic exponential backoff.

Frontend permission checks are user-interface controls only. Backend policy and tenant-scoped queries remain authoritative. The complete role/resource matrix is still being expanded; do not infer authorization from this README.

## Configuration

Important root `.env` values:

| Variable | Purpose |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | PostgreSQL connection and container initialization |
| `JWT_SECRET` | Required Base64 HMAC key of at least 32 decoded bytes |
| `JWT_EXPIRATION_HOURS` | Access-token duration |
| `GOOGLE_CLIENT_ID` | Expected Google token audience |
| `APP_CORS_ALLOWED_ORIGINS` | Explicit browser origins |
| `API_BIND_ADDRESS`, `API_PORT` | Local direct API binding |
| `APP_BIND_ADDRESS`, `APP_PORT` | Local app binding |

Do not commit `.env` or production credentials.

## Tests

Backend:

```bash
./gradlew :api:test :api:build --no-daemon
```

Backend integration tests use Docker/Testcontainers. Existing tests cover selected auth, tenant, timer, and permission cases; they do not yet prove every endpoint/role combination.

Frontend:

```bash
cd app
bun install --frozen-lock-file
bun run lint
bun run test
bun run build
```

MSW is configured for the current Vitest suite. Coverage is focused on the API client and selected helpers/components; no Playwright E2E suite is currently configured, and no coverage percentage is claimed.

## CI And Releases

Tracked workflows:

| Workflow | Purpose |
|---|---|
| `.github/workflows/quality.yml` | Backend/frontend gates, dependency review, Gitleaks, CodeQL, container scans, and SBOM artifacts |
| `.github/workflows/api-ci.yml` | API test, idempotent version tag/release, image push, SBOM/provenance |
| `.github/workflows/app-ci.yml` | Frozen install, app test, idempotent version tag/release, image push, SBOM/provenance |

There are no separate `api-cd.yml` or `app-cd.yml` workflows. Release workflows require `DOCKER_HUB_USERNAME` and `DOCKER_HUB_PAT`; GHCR uses `GITHUB_TOKEN`. Protected environments and deployment/rollback automation are not configured here.

## Backup And Restore

See `docs/runbooks/backup-restore.md`. The scripts support configurable `DB_CONTAINER`, `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. Restore validates the dump in a temporary database, refuses to run while the API container is active, and requires explicit confirmation.

These scripts are manual logical backups only. They do not provide encryption, retention, off-host replication, WAL archiving/PITR, scheduling, monitoring, or evidence that RPO/RTO has been met.

## Known Limitations

- Reports export synchronous CSV only. The export-job response is a ready-link facade, not a durable asynchronous worker; PDF and XLSX are unsupported.
- Activity attachments store metadata and a caller-provided URL only. TaskY does not currently upload objects, issue presigned URLs, enforce a MIME allowlist, or scan files for malware.
- The local/production Compose files are baselines, not a complete production platform.
- Enterprise roadmap tasks remain partial as documented in `docs/ROADMAP_STATUS.md`.

Operational documentation:

- `docs/onboarding.md`
- `docs/runbooks/backup-restore.md`
- `docs/quality/security-test-matrix.md`
- `docs/governance/lgpd.md`
- `docs/ANALISE_TASKY.md`
