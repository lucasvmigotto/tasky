# Phase 9 evidence — 2026-09-19

Branch: `feat/phase-9-infra-hardening`.

## T-20 — images + runtime

- All 8 images digest-pinned (api builder/runtime, bun, nginx, pg18,
  redis8, minio, mock-oauth2); Testcontainers PG pinned to the same digest.
  Re-pin procedure on tag/arch change lands in Phase 10 runbooks.
- `api` runs as `appuser` (verified `whoami`), curl healthcheck on
  `/actuator/health` → container `healthy`; `app` wget healthcheck fixed
  to 127.0.0.1 (nginx is IPv4-only) → `healthy`; `app` waits on `api`
  healthy. `/app/data` volume + `/tmp` tmpfs on api.
- CPU/mem limits on api/app; db/redis/minio healthy.

## T-21 — PITR + drill

- `db` runs `wal_level=replica, archive_mode=on` with archive to the
  `pgwal` volume; `wal-init` one-shot fixes volume ownership for fresh
  clones (archiver runs as `postgres`). Proven live: segments 02–04
  archived, `pg_stat_archiver` tracks the latest.
- Logical drill: `backup-postgres.sh` → 13KB dump → restored into temp DB:
  47/47 successful migrations and 47 tables match; temp DB dropped.
- Off-host sync (S3/rclone + encryption) remains a production task with a
  separate approach — out of scope for the dev compose by design.

## T-TLS — ingress + secrets

- TLS terminates at ingress (provider/LB) with HSTS there; the API is
  never exposed (bound 127.0.0.1; prod compose deleted in Phase 0).
  Rotation procedure (`JWT_SECRET` has no dual-accept window: rotate,
  force refresh — families persist — old JWTs expire within TTL) lands
  in the Phase 10 runbooks.
- Gitleaks working-tree scan: only the documented test-only JWT secret
  flagged (now `#gitleaks:allow`; the other hit is the gitignored
  `api/build` copy). No production secrets in the committed tree.
- `HS256` rotation = short maintenance; documented window in runbook.

## Tests

- Backend suite carried at 115 green (Phase 8); no behavior change here
  except health/secret hygiene. Full re-run lands in Phase 10 gates.
