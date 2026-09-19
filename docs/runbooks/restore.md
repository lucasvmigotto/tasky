# Restore (from Phase 9 drill)

## What exists

- Continuous WAL archiving to the `pgwal` volume (`wal_level=replica`,
  proven live: segments archived, `pg_stat_archiver` current).
- Logical dumps: `scripts/backup-postgres.sh` (gzip, verified dump-or-fail,
  no empty-gzip trap).

## Drill (proven 2026-09-19)

```bash
sh scripts/backup-postgres.sh2424              # backups/tasky-<ts>.sql.gz
docker exec tasky-db psql -U tasky -d postgres -c "CREATE DATABASE tasky_restore_drill;"
gunzip -c backups/tasky-<ts>.sql.gz | docker exec -i tasky-db psql -U tasky -d tasky_restore_drill -q
# compare: flyway_schema_history success count + table count live vs drill
docker exec tasky-db psql -U tasky -d postgres -c "DROP DATABASE tasky_restore_drill;"
```

Result: 47/47 migrations, 47 tables matched.

## Disaster restore

```bash
docker compose stop api
sh scripts/restore-postgres.sh backups/tasky-<ts>.sql.gz   # confirms before running
docker compose up -d api
```

RPO/RTO: WAL archive gives point-in-time potential; measured logical path
is minutes for this data size. Off-host encrypted copies (S3/rclone + KMS)
are a production-track item with a separate approach.

## WAL volume ownership (fresh clones)

The archiver runs as `postgres`; the `wal-init` one-shot service chowns
`pgwal` on every `up`. If archiving stalls (`last_failed_wal` set in
`pg_stat_archiver`), check volume ownership first.
