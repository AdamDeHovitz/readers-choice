#!/usr/bin/env bash
# Check that a PR's verification file exists and every required section has
# content. Structure only: whether the evidence is good is the reviewer's call.
#
#   scripts/check-verification.sh <pr-number>
#
# See verifications/README.md.
set -euo pipefail
cd "$(dirname "$0")/.."

pr="${1:?usage: $0 <pr-number>}"
file="verifications/$pr.md"
sections=("Change" "Checks" "Behavior" "Not verified" "Harness gaps")

if [[ ! -f "$file" ]]; then
  echo "Missing $file. Copy verifications/TEMPLATE.md to $file, fill it in, and push." >&2
  exit 1
fi

# Strip HTML comments (the template's guidance) so an untouched section reads
# as empty, then print each "## " section's remaining non-blank line count.
counts="$(
  perl -0pe 's/<!--.*?-->//gs' "$file" | awk '
    /^## / { name = substr($0, 4); sub(/[ \t]+$/, "", name); n[name] = 0; seen[name] = 1; cur = name; next }
    /^# / { cur = ""; next }
    cur != "" && NF { n[cur]++ }
    END { for (s in seen) print s "\t" n[s] }
  '
)"

failed=0
for s in "${sections[@]}"; do
  line="$(printf '%s\n' "$counts" | awk -F'\t' -v s="$s" '$1 == s')"
  if [[ -z "$line" ]]; then
    echo "$file: missing section \"## $s\"" >&2
    failed=1
  elif [[ "${line##*$'\t'}" == 0 ]]; then
    echo "$file: section \"## $s\" is empty (write \"None.\" if that is the honest answer)" >&2
    failed=1
  fi
done

if [[ $failed == 0 ]]; then
  echo "$file: all sections filled in."
fi
exit "$failed"
