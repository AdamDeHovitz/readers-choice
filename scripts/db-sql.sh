#!/usr/bin/env bash
# psql against the local Supabase database, never production.
#   npm run db:sql -- -c "select ..."
# Uses the host's psql if installed, otherwise the one in the stack's db container.
set -euo pipefail

if command -v psql >/dev/null 2>&1; then
  exec psql postgresql://postgres:postgres@127.0.0.1:54322/postgres "$@"
fi

container="supabase_db_readers-choice" # project_id in supabase/config.toml
if ! docker inspect "$container" >/dev/null 2>&1; then
  echo "No psql on PATH and no $container container. Start the stack with 'npm run db:start'." >&2
  exit 1
fi
# -t only when stdin is a terminal, so piped SQL (< file.sql) still works.
if [[ -t 0 ]]; then
  exec docker exec -it "$container" psql -U postgres -d postgres "$@"
fi
exec docker exec -i "$container" psql -U postgres -d postgres "$@"
