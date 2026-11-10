#!/usr/bin/env bash
# psql against the local Supabase database, never production.
#   npm run db:sql -- -c "select ..."
#   npm run db:sql < file.sql
# Uses the host's psql if installed, otherwise the one in the stack's db
# container. A failing statement makes the command exit non-zero.
set -euo pipefail

if command -v psql >/dev/null 2>&1; then
  exec psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 "$@"
fi

container="supabase_db_readers-choice" # project_id in supabase/config.toml
if ! docker inspect "$container" >/dev/null 2>&1; then
  echo "No psql on PATH and no $container container. Start the stack with 'npm run db:start'." >&2
  exit 1
fi
# A TTY only for an interactive session: with one, psql colors and pages its
# output, which corrupts anything redirected or piped.
if [[ -t 0 && -t 1 ]]; then
  exec docker exec -it "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
fi
exec docker exec -i -e PAGER=cat "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
