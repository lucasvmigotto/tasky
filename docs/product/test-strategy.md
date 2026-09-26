# TaskY — Test strategy (as-is)

> Reconstructed by project:introspec 2026-09-26. Describes what exists,
> not what should.

## Layers

| Layer | Tool | Scope | Gate |
|---|---|---|---|
| Backend unit | JUnit + Mockito | pure helpers (pause math, reconcile, transitions) | must pass |
| Backend integration | Testcontainers (PG) + Hibernate statistics | concurrency (overlap, version, timer), lifecycle (timesheet, refresh, export), query counts (comments ≤6, feed ≤8) | must pass, 118/118 green |
| Frontend unit | vitest + MSW | stores (`reconcileTrackerState`), hooks, `apiUrl` seam, race timeout | must pass, 54/54 green |
| Frontend typecheck/lint | `tsc --noEmit` | full app | must pass |
| E2E | Playwright, profiles `auth` + `timesheet` (mock-OIDC tokens) | login redirect/buttons/bounce, timesheet render | must pass |
| Contract | `scripts/check-openapi-contract.sh` vs live `/api-docs` | 6 covered DTO schemas | must pass |
| Perf smoke | k6 (`docs/perf/`) | report endpoints under load | advisory |
| Security regression | `docs/quality/security-test-matrix.md` | IDOR/tenant matrix | must pass on auth-area changes |

## Environments & data

- Dev: single `docker-compose.yml` (api/app/db/redis/minio/mock-oauth2),
  dev-only. Tests: Testcontainers ephemeral PG; frontend MSW absolute-URL
  handlers; uploads isolated to `/tmp/tasky-test-uploads` in tests.
- No committed fixtures with secrets; `.env` is gitignored scratch.

## Gaps (Planned, not scheduled)

- E2E timer flows (start→pause→stop→timesheet→report).
- Recurrence idempotency under load; S3-path verification runbook.
- Batch timesheet-queue UI multi-select coverage.
