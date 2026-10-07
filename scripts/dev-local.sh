#!/usr/bin/env bash
# Run the app against the local Supabase stack, never production.
# Starts the stack if needed; data comes from supabase/seed.sql (npm run db:reset).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! npx supabase status >/dev/null 2>&1; then
  npx supabase start
fi

eval "$(npx supabase status -o env 2>/dev/null | sed 's/^/LOCAL_/')"

case "${LOCAL_API_URL:-}" in
  http://127.0.0.1:* | http://localhost:*) ;;
  *)
    echo "Refusing to start: Supabase API URL '${LOCAL_API_URL:-}' is not local." >&2
    exit 1
    ;;
esac

PORT="${PORT:-3000}"

# Real environment variables take precedence over .env.local, so these
# override any production values there.
export NEXT_PUBLIC_SUPABASE_URL="$LOCAL_API_URL"
export SUPABASE_SERVICE_ROLE_KEY="$LOCAL_SERVICE_ROLE_KEY"
export AUTH_SECRET="local-dev-auth-secret-not-for-production"
export AUTH_URL="http://localhost:$PORT"

echo "Readers' Choice on http://localhost:$PORT -> local Supabase $LOCAL_API_URL (Studio: $LOCAL_STUDIO_URL)"
exec npx next dev --turbopack --port "$PORT"
