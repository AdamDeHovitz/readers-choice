#!/usr/bin/env bash
# psql against the LOCAL Supabase database (never production). Uses psql from
# PATH if installed, otherwise the one inside the stack's database container.
# A failing statement makes the command exit non-zero.
#   npm run db:sql -- -c "select count(*) from meetings"
#   npm run db:sql < file.sql
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v psql >/dev/null 2>&1; then
  exec psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 "$@"
fi

project_id=$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)
container="supabase_db_${project_id}"
# A TTY only for an interactive session: with one, psql colors and pages its
# output, which corrupts anything redirected or piped.
if [[ -t 0 && -t 1 ]]; then
  exec docker exec -it "$container" psql -U postgres -v ON_ERROR_STOP=1 "$@"
fi
exec docker exec -i -e PAGER=cat "$container" psql -U postgres -v ON_ERROR_STOP=1 "$@"
