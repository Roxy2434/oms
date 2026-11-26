#!/bin/sh
# Restore latest backup into an OWNED disposable database, never into oms.
set -eu
cd "$(dirname "$0")"
name="oms_restore_$(date -u +%Y%m%d%H%M%S)"
project="${OMS_COMPOSE_PROJECT:-oms-public}"
case "$project" in oms-public*) ;; *) echo "Refuse non-public project" >&2; exit 1;; esac
env_file="${OMS_COMPOSE_ENV:-.env}"
dc() {
 if [ -n "${OMS_COMPOSE_EXTRA:-}" ]; then docker compose --env-file "$env_file" -p "$project" -f compose.yaml -f "$OMS_COMPOSE_EXTRA" "$@";
 else docker compose --env-file "$env_file" -p "$project" -f compose.yaml "$@"; fi
}
cleanup() { dc exec -T db dropdb -U oms_owner --if-exists "$name" >/dev/null; }
trap cleanup EXIT HUP INT TERM
dc exec -T db createdb -U oms_owner -O oms_app "$name"
dc exec -T backup sh -c 'latest=$(ls -1t /backups/oms_*.dump | head -1); test -n "$latest"; pg_restore --no-owner --no-privileges --exit-on-error --dbname="$1" "$latest"; psql -v ON_ERROR_STOP=1 --dbname="$1" -c "SELECT count(*) AS restored_orders FROM \"DON_HANG\";"' sh "$name"
echo "PASS restore completed into disposable database; main DB not changed"
