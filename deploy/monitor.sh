#!/bin/sh
set -eu
while :; do
 unhealthy=0
 if ! wget -q -O /tmp/health --timeout=10 http://backend:3001/api/health; then unhealthy=1; fi
 if grep -q '"bank":"degraded"' /tmp/health 2>/dev/null; then unhealthy=1; fi
 if [ ! -f /backups/last-success ] || [ -n "$(find /backups/last-success -mmin +420 -print)" ]; then unhealthy=1; fi
 if [ "$unhealthy" = 1 ]; then
  echo "ALERT: application/bank sync/backup needs attention" >&2
  if [ -n "${OPS_ALERT_URL:-}" ]; then wget -q -O /dev/null --timeout=10 --post-data='event=health_or_backup_degraded' "$OPS_ALERT_URL" || true; fi
 fi
 sleep 60
done
