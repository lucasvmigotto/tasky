# Deploy (development stack)

## Prerequisites

- Docker Engine + Compose v2, `JWT_SECRET` (base64 ≥ 32 bytes) in `.env`
  (copy from `.env.example`; never commit `.env`).
- Fresh clone: `cp .env.example .env` then edit secrets.

## Deploy

```bash
docker compose up -d --build
docker compose ps                    # all services healthy
curl -sf http://127.0.0.1:8080/actuator/health   # {"status":"UP"}
curl -sf http://127.0.0.1:5173/ -o /dev/null -w "%{http_code}\n"  # 200
./scripts/check-openapi-contract.sh  # contract green
```

Migrations (Flyway V1–V47+) apply automatically on API boot; boot fails
closed on validation errors — fix forward with a new migration, never edit
an applied one.

## Image pins

All images are digest-pinned (`docker-compose.yml`, Dockerfiles,
`BaseIntegrationTest`). To bump a tag:

```bash
docker pull <image>:<tag>
docker inspect --format='{{index .RepoDigests 0}}' <image>:<tag>
```

Replace the digest in place, rebuild, run the gates below, commit.
Different CPU architectures resolve different digests — re-pin per arch.

## JWT rotation (HS256, no dual-accept window)

1. Generate: `openssl rand -base64 32`.
2. Set the new `JWT_SECRET`, restart api (`docker compose up -d api`).
3. Refresh sessions persist in Postgres: users re-login transparently via
   `/auth/refresh` rotation; outstanding access tokens expire within
   `JWT_EXPIRATION_HOURS`. Short maintenance window, announced upfront.
