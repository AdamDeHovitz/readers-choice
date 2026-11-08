#!/usr/bin/env bash
# Writes a short Markdown summary of a Playwright JSON report for the GitHub job
# summary. Usage: e2e-summary.sh <title> <results.json> [report-artifact-url]
set -euo pipefail

title="$1"
results="$2"
report_url="${3:-}"

echo "### $title"
if [[ ! -s "$results" ]]; then
  echo "**No test results**: the run failed before tests ran. See the job log."
else
  jq -r '
    .stats as $s
    | "**\(if $s.unexpected > 0 then "FAILED" else "Passed" end)**: "
      + "\($s.expected) passed, \($s.unexpected) failed, \($s.flaky) flaky, "
      + "\($s.skipped) skipped in \($s.duration / 1000 | floor)s",
      ([.. | objects | select(has("specs")) | .specs[]
        | select(.ok | not) | "- \(.file):\(.line) \(.title)"]
       | if length > 0 then "\nFailed:\n" + join("\n") else empty end),
      ((.errors // []) | map("- " + (.message | split("\n")[0]))
       | if length > 0 then "\nErrors:\n" + join("\n") else empty end)
  ' "$results"
fi
if [[ -n "$report_url" ]]; then
  echo
  echo "Evidence: [HTML report with screenshots and traces]($report_url) (unzip, then \`npx playwright show-report <dir>\`)"
fi
