#!/bin/sh
# Nightly backup (compose.prod.yaml `backup` service; CI runs it once against the test database).
# Dumps the database and archives storage/ into $BACKUP_DIR, then restores the dump into a scratch database
# and checks it: the restore is tested every night, not on the day it is needed. Keeps 14 days.
# Needs PGHOST, PGUSER, PGPASSWORD and PGDATABASE. Prints PASS or FAIL; exits non-zero on FAIL.
set -eu
dir=${BACKUP_DIR:-/backups}
storage=${STORAGE_DIR:-/storage}
stamp=$(date -u +%Y-%m-%dT%H%M)
dump="$dir/petty-$stamp.dump"
mkdir -p "$dir"

pg_dump -Fc -f "$dump.part" && mv "$dump.part" "$dump"
if [ -d "$storage" ]; then tar -czf "$dir/storage-$stamp.tgz" -C "$storage" .; fi

check=petty_restore_check
dropdb --if-exists "$check"
createdb "$check"
pg_restore --no-owner -d "$check" "$dump"
count() { psql -d "$1" -tAc "select (select count(*) from _prisma_migrations) || ' ' || (select count(*) from pairs) || ' ' || (select count(*) from verdicts)"; }
live=$(count "$PGDATABASE")
restored=$(count "$check")
dropdb "$check"

find "$dir" -name 'petty-*.dump' -mtime +14 -delete
find "$dir" -name 'storage-*.tgz' -mtime +14 -delete

# Rows written between the dump and the count make "live" larger, never smaller.
set -- $live
lm=$1; lp=$2; lv=$3
set -- $restored
if [ "$1" -eq "$lm" ] && [ "$2" -gt 0 -o "$lp" -eq 0 ] && [ "$2" -le "$lp" ] && [ "$3" -le "$lv" ]; then
  echo "backup $stamp PASS: restored migrations=$1 pairs=$2 verdicts=$3 ($(du -h "$dump" | cut -f1))"
else
  echo "backup $stamp FAIL: live $live, restored $restored" >&2
  exit 1
fi
