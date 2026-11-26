#!/bin/sh
set -eu
umask 077
mkdir -p /backups
while :; do
 stamp="$(date -u +%Y%m%dT%H%M%SZ)"
 placeholder="$(mktemp "/backups/oms_${stamp}.XXXXXX")"
 temp="${placeholder}.partial"
 mv "$placeholder" "$temp"
 dest="${placeholder}.dump"
 if pg_dump --format=custom --no-owner --file="$temp" && pg_restore --list "$temp" >/dev/null; then
  mv "$temp" "$dest"
  date -u +%FT%TZ > /backups/last-success
  echo "Backup completed ($stamp)"
  find /backups -type f -name 'oms_*.dump' -mtime +7 -delete
 else
  rm -f "$temp"; echo "ERROR: backup failed" >&2
  if [ -n "${OPS_ALERT_URL:-}" ]; then wget -q -O /dev/null --timeout=10 --post-data='event=backup_failed' "$OPS_ALERT_URL" || true; fi
  exit 1
 fi
 [ "${BACKUP_ONCE:-0}" = 1 ] && exit 0
 sleep "${BACKUP_INTERVAL_SECONDS:-21600}"
done
