#!/usr/bin/env bash
# psql against the LOCAL Supabase database (never production). Uses psql from
# PATH if installed, otherwise the one inside the stack's database container.
#   npm run db:sql -- -c "select count(*) from meetings"
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v psql >/dev/null 2>&1; then
  exec psql postgresql://postgres:postgres@127.0.0.1:54322/postgres "$@"
fi

project_id=$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)
exec docker exec -i "supabase_db_${project_id}" psql -U postgres "$@"
