#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=app_password="$APP_DB_PASSWORD" <<'SQL'
CREATE ROLE oms_app LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEROLE NOCREATEDB NOREPLICATION;
ALTER DATABASE oms OWNER TO oms_app;
ALTER SCHEMA public OWNER TO oms_app;
SQL
