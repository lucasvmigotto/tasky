#!/usr/bin/env sh
set -eu

DB_CONTAINER="${DB_CONTAINER:-tasky-db}"
POSTGRES_DB="${POSTGRES_DB:-tasky}"
POSTGRES_USER="${POSTGRES_USER:-tasky}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-tasky}"
BACKUP_DIR="${BACKUP_DIR:-backups}"

case "$DB_CONTAINER:$POSTGRES_DB:$POSTGRES_USER" in
  *[!A-Za-z0-9_.:-]*)
    echo "container, database, and user names contain unsupported characters" >&2
    exit 1
    ;;
esac

mkdir -p "$BACKUP_DIR"
ts="$(date +%Y%m%d-%H%M%S)"
out="$BACKUP_DIR/${POSTGRES_DB}-${ts}.sql.gz"
sql_tmp="${out%.gz}.tmp"
gzip_tmp="${out}.tmp"

cleanup() {
  rm -f "$sql_tmp" "$gzip_tmp"
}
trap cleanup EXIT HUP INT TERM

# Do not pipe pg_dump into gzip: POSIX sh has no pipefail, so a failed dump
# could otherwise leave a valid empty gzip and report success.
docker exec -e "PGPASSWORD=$POSTGRES_PASSWORD" "$DB_CONTAINER" \
  pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
  --format=plain --no-owner --no-privileges > "$sql_tmp"

if [ ! -s "$sql_tmp" ]; then
  echo "pg_dump produced an empty file" >&2
  exit 1
fi

gzip -c "$sql_tmp" > "$gzip_tmp"
gzip -t "$gzip_tmp"
mv "$gzip_tmp" "$out"

echo "$out"
