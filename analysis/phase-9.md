# PHASE 9 — Infrastructure / Production Hardening

> Goal: images, runtime, data safety proven — not just configured. Size: S
> (1 week) + quarterly drill.

## 1. Objectives

- Pinned, non-root, healthchecked, limited containers.
- PITR + off-host backups + proven restore (RPO ≤24h / RTO ≤4h measured, not
  goals).
- TLS/ingress documented; secrets rotation runbook.

## 2. Tasks

### T-20 — Harden images + runtime (P1 / S)

- Pin digests: `eclipse-temurin:21-jre@sha256:...`,
  `nginx:stable-alpine@sha256:...`, `postgres:16-alpine@sha256:...`,
  `oven/bun:1@sha256:...` (record renovate/dependabot to bump).
  Api `USER appuser` (non-root, writable `/tmp` only); `HEALTHCHECK`
  api (`/actuator/health`), app (`/index.html`), keep db `pg_isready`;
  Compose `depends_on api healthy` for app; `deploy.resources.limits`
  (api 1 CPU/1G, app 0.5/256M, db 1/1G — tune from PHASE 0 baseline);
  `read_only: true` + `tmpfs` where feasible.
- Affected: `api/Dockerfile`, `app/Dockerfile`, both composes. BE/FE code:
  none (health already exists).
- Pitfalls: Temurin non-root needs `chown` jar + `/tmp` (PSQL driver writes);
  Nginx needs `/tmp/nginx.pid` + cache tmpfs (already `pid /tmp` — keep);
  BuildKit `--mount=bind` preserved.
- Tests: `docker compose up` fresh-clone green; `whoami` ≠ root in api;
  kill -9 api → compose restarts healthy; Trivy clean.
- Acceptance: digests pinned, no root, healthchecks green, limits enforced
  (`docker stats`).
- DoD: TASK-032 evidence; SBOM still attaches (provenance unaffected).
- Deps: none.

### T-21 — PITR + off-host + drill (P1 / M initial, then quarterly)

- Enable WAL archiving (`wal_level=replica`, `archive_command` to volume +
  off-host sync script — S3/rclone, encrypted with age/KMS); base backup
  weekly + WAL continuous; retention 30d; existing `backup-postgres.sh/
  restore-postgres.sh` kept for logical dumps (add encryption + retention +
  off-host copy — currently gaps per docs).
- Drill: quarterly `restore-postgres.sh` to temp DB + PITR timestamp recovery
  proof (record RPO/RTO measured); runbook `docs/runbooks/backup-restore.md`
  updated from goals → measured numbers.
- Affected: Compose db command/volume, `scripts/*`, docs. BE: none.
- Pitfalls: archive filling disk — monitor + alert (PHASE 6); encryption keys
  in secret store, never repo; `CONFIRM_RESTORE` guard kept.
- Tests: kill pgdata → PITR to T-5min → row-count + checksum match; logical
  restore path still works.
- Acceptance: measured RPO/RTO in doc; drill log committed.
- DoD: TASK-029 evidenced (not Parcial).
- Deps: PHASE 6 alerts (disk/archive).

### T-TLS — Ingress + secrets runbook (P2 / S)

- Document: TLS terminates at ingress (provider/LB), HSTS there, api never
  exposed (prod compose already hides), `APP_CORS_ALLOWED_ORIGINS` explicit,
  `JWT_SECRET` rotation steps (dual-accept window? HS256 has none — rotation =
 短 maintenance: issue new secret, force refresh (families persist), old JWTs
  expire ≤4h after T-22 short TTL — document window).
- History secret scan (`gitleaks` full-history) + rotation proof ticket.
- Acceptance: runbook reviewed; TASK-001 closed.
- DoD: docs + drill entry.

## 3. Risks + Rollback

Digest pin blocks builds on upstream removal — renovate PRs mitigate. PITR
misconfig can bloat — alert + cap. Rollback: prior digests tagged.

## 4. Definition of Done

- Non-root pinned healthchecked limited stack green fresh-clone; PITR drill
  measured + logged; TLS/secrets runbooks published; TASK-029/032 closed.
