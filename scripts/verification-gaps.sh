#!/usr/bin/env bash
# Print the "Not verified" and "Harness gaps" sections of recent verification
# files: the to-do list for making this repo easier to verify.
#
#   scripts/verification-gaps.sh [count]   # default: the 10 newest PRs
#
# See verifications/README.md.
set -euo pipefail
cd "$(dirname "$0")/.."

count="${1:-10}"
if [[ ! $count =~ ^[1-9][0-9]*$ ]]; then
  echo "usage: $0 [count] (got '$count')" >&2
  exit 2
fi

files="$(ls verifications | grep -E '^[0-9]+\.md$' | sort -rn | head -n "$count" || true)"
if [[ -z $files ]]; then
  echo "No verification files yet."
  exit 0
fi

while read -r f; do
  { perl scripts/verification-sections.pl "verifications/$f" || true; } |
    awk -F'\t' -v pr="#${f%.md}" '
      $1 == "C" && ($2 == "not verified" || $2 == "harness gaps") {
        if ($2 != last) { print "\n" pr " " $2; last = $2 }
        line = $0; sub(/^[^\t]*\t[^\t]*\t/, "", line)
        print "  " line
      }
    '
done <<<"$files"
