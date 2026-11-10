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
if [[ ! $pr =~ ^[0-9]+$ ]]; then
  echo "usage: $0 <pr-number> (got '$pr')" >&2
  exit 2
fi
file="verifications/$pr.md"
sections=("change" "checks" "behavior" "not verified" "harness gaps")

if [[ ! -f "$file" ]]; then
  echo "Missing $file. Copy verifications/TEMPLATE.md to $file, fill it in, and push." >&2
  exit 1
fi

# Template guidance lives in HTML comments; an unclosed one would also hide
# the rest of the file when GitHub renders it.
stripped="$(perl -0pe 's/<!--.*?-->//gs' "$file")"
if [[ $stripped == *"<!--"* ]]; then
  echo "$file: unclosed <!-- comment; everything after it is hidden on GitHub" >&2
  exit 1
fi

records="$(printf '%s\n' "$stripped" | awk -f scripts/verification-sections.awk)"

failed=0
for s in "${sections[@]}"; do
  headings="$(printf '%s\n' "$records" | awk -F'\t' -v s="$s" '$1 == "H" && $2 == s' | wc -l | tr -d ' ')"
  content="$(printf '%s\n' "$records" | awk -F'\t' -v s="$s" '$1 == "C" && $2 == s' | wc -l | tr -d ' ')"
  if [[ $headings == 0 ]]; then
    echo "$file: missing section \"## ${s}\"" >&2
    failed=1
  elif [[ $headings -gt 1 ]]; then
    echo "$file: section \"## ${s}\" appears $headings times; keep one" >&2
    failed=1
  elif [[ $content == 0 ]]; then
    echo "$file: section \"## ${s}\" is empty (if nothing applies, say so, e.g. \"None.\")" >&2
    failed=1
  fi
done

if [[ $failed == 0 ]]; then
  echo "$file: all sections filled in."
fi
exit "$failed"
