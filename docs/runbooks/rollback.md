# Rollback

## Application (images)

Images are tagged per release (`api-$V` / `app-$V`, see `api-ci.yml` /
`app-ci.yml`), so rollback is a re-deploy of the prior tag:

```bash
docker pull <registry>/tasky-api:<previous-version>
# point the deploy at the prior tag, then:
docker compose up -d api app
docker compose ps
curl -sf http://127.0.0.1:8080/actuator/health
```

## Database (forward-fix only)

Flyway has no downs. Never downgrade the schema to match an older image:

1. Keep the DB at its current version.
2. If the previous image cannot boot against it, roll **forward**: ship a
   fix release, do not restore an old dump over a newer schema (exports,
   audit events and refresh families created since would be lost).
3. Logical restores (`scripts/restore-postgres.sh`) are for disaster
   recovery (see `restore.md`), require the API stopped, and need a
   confirmation flag by design.

## Export/report workers

In-flight `PROCESSING` export jobs survive restarts (claimed via
`SKIP LOCKED` on next tick); `FAILED` jobs carry `last_error` + attempts.
No manual queue cleanup is needed after rollback.
