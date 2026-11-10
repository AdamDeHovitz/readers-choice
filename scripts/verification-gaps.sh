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

ls verifications | grep -E '^[0-9]+\.md$' | sort -rn | head -n "$count" |
  while read -r f; do
    perl -0pe 's/<!--.*?-->//gs' "verifications/$f" | awk -v pr="#${f%.md}" '
      /^## / { show = ($0 ~ /^## (Not verified|Harness gaps)[ \t]*$/) }
      /^## / && show { print "\n" pr " " substr($0, 4); next }
      /^# / { show = 0 }
      show && NF { print "  " $0 }
    '
  done
