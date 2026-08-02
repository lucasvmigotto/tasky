#!/usr/bin/env sh
set -eu

if [ $# -ne 1 ]; then
  echo "usage: scripts/restore-postgres.sh <backup.sql.gz>" >&2
  exit 1
fi

backup="$1"
DB_CONTAINER="${DB_CONTAINER:-tasky-db}"
API_CONTAINER="${API_CONTAINER:-tasky-api}"
POSTGRES_DB="${POSTGRES_DB:-tasky}"
POSTGRES_USER="${POSTGRES_USER:-tasky}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-tasky}"

case "$DB_CONTAINER:$API_CONTAINER:$POSTGRES_DB:$POSTGRES_USER" in
  *[!A-Za-z0-9_.:-]*)
    echo "container, database, and user names contain unsupported characters" >&2
    exit 1
    ;;
esac
case "$POSTGRES_DB" in
  postgres|template0|template1)
    echo "refusing to restore over PostgreSQL system database: $POSTGRES_DB" >&2
    exit 1
    ;;
esac

if [ ! -f "$backup" ] || [ ! -s "$backup" ]; then
  echo "backup does not exist or is empty: $backup" >&2
  exit 1
fi

if [ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)" != "true" ]; then
  echo "database container is not running: $DB_CONTAINER" >&2
  exit 1
fi
if [ "$(docker inspect -f '{{.State.Running}}' "$API_CONTAINER" 2>/dev/null || true)" = "true" ]; then
  echo "refusing restore while $API_CONTAINER is running; stop the API first" >&2
  exit 1
fi

gzip -t "$backup"
sql_tmp="${TMPDIR:-/tmp}/tasky-restore-$$.sql"
validation_db="tasky_restore_check_$(date +%Y%m%d%H%M%S)_$$"
validation_created=false

cleanup() {
  rm -f "$sql_tmp"
  if [ "$validation_created" = true ]; then
    docker exec -e "PGPASSWORD=$POSTGRES_PASSWORD" "$DB_CONTAINER" \
      dropdb --if-exists --force --username="$POSTGRES_USER" "$validation_db" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT HUP INT TERM

gzip -dc "$backup" > "$sql_tmp"
if ! grep -q '^-- PostgreSQL database dump' "$sql_tmp"; then
  echo "file is not a plain-format PostgreSQL dump" >&2
  exit 1
fi

docker exec -e "PGPASSWORD=$POSTGRES_PASSWORD" "$DB_CONTAINER" \
  createdb --username="$POSTGRES_USER" --template=template0 "$validation_db"
validation_created=true
docker exec -i -e "PGPASSWORD=$POSTGRES_PASSWORD" "$DB_CONTAINER" \
  psql --username="$POSTGRES_USER" --dbname="$validation_db" --set=ON_ERROR_STOP=1 < "$sql_tmp"

table_count="$(docker exec -e "PGPASSWORD=$POSTGRES_PASSWORD" "$DB_CONTAINER" \
  psql --username="$POSTGRES_USER" --dbname="$validation_db" --tuples-only --no-align \
  --command="SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")"
if [ "${table_count:-0}" -eq 0 ]; then
  echo "validation restore contains no public tables" >&2
  exit 1
fi

docker exec -e "PGPASSWORD=$POSTGRES_PASSWORD" "$DB_CONTAINER" \
  dropdb --force --username="$POSTGRES_USER" "$validation_db"
validation_created=false

expected="RESTORE $POSTGRES_DB"
if [ "${CONFIRM_RESTORE:-}" != "$expected" ]; then
  if [ ! -t 0 ]; then
    echo "non-interactive restore requires CONFIRM_RESTORE='$expected'" >&2
    exit 1
  fi
  printf "Validated %s in a temporary database. Type '%s' to destroy and restore database '%s': " \
    "$backup" "$expected" "$POSTGRES_DB" >&2
  IFS= read -r confirmation
  if [ "$confirmation" != "$expected" ]; then
    echo "restore cancelled" >&2
    exit 1
  fi
fi

docker exec -e "PGPASSWORD=$POSTGRES_PASSWORD" "$DB_CONTAINER" \
  psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --set=ON_ERROR_STOP=1 \
  --command='DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
docker exec -i -e "PGPASSWORD=$POSTGRES_PASSWORD" "$DB_CONTAINER" \
  psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --set=ON_ERROR_STOP=1 < "$sql_tmp"

echo "restored $backup into $POSTGRES_DB"
