#!/usr/bin/env bash
# Run the app against the local Supabase stack, never production.
# Starts the stack if needed; data comes from supabase/seed.sql (npm run db:reset).
#   scripts/dev-local.sh             next dev
#   scripts/dev-local.sh --prebuilt  serve an existing `next build` (CI builds
#                                    while Supabase starts; see ci.yml)
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

echo "Readers' Choice on http://localhost:$PORT -> local Supabase $LOCAL_API_URL (Studio: ${LOCAL_STUDIO_URL:-not running})"

if [[ "${1:-}" == "--prebuilt" ]]; then
  # The build inlines NEXT_PUBLIC_SUPABASE_URL, so make sure it was built
  # against this local stack and not, say, production from .env.local.
  if ! grep -rqF "$LOCAL_API_URL" apps/web/.next/server 2>/dev/null; then
    echo "Refusing to start: .next was not built with NEXT_PUBLIC_SUPABASE_URL=$LOCAL_API_URL." >&2
    exit 1
  fi
  cd apps/web
  exec npx next start --port "$PORT"
fi
cd apps/web
exec npx next dev --turbopack --port "$PORT"
