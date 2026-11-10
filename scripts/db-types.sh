#!/usr/bin/env bash
# Generate server/database.types.ts from the local Supabase schema.
#   scripts/db-types.sh          regenerate the file
#   scripts/db-types.sh --check  fail if it's out of date (CI)
# Needs the local stack running with every migration applied (npm run db:reset).
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET=server/database.types.ts
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

npx supabase gen types typescript --local > "$TMP/database.types.ts"
npx prettier --stdin-filepath "$TARGET" < "$TMP/database.types.ts" > "$TMP/formatted.ts"

if [[ "${1:-}" == "--check" ]]; then
  if ! diff -u "$TARGET" "$TMP/formatted.ts"; then
    echo "$TARGET is out of date with supabase/migrations. Run: npm run db:types" >&2
    exit 1
  fi
  echo "$TARGET is up to date."
else
  mv "$TMP/formatted.ts" "$TARGET"
  echo "Wrote $TARGET"
fi
