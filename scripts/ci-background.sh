#!/usr/bin/env bash
# Run a slow CI step in the background so the steps after it overlap it.
#   scripts/ci-background.sh start NAME CMD [ARGS...]   start CMD, logging to $RUNNER_TEMP/NAME.log
#   scripts/ci-background.sh wait NAME                  wait for it, print its log, exit with its status
set -euo pipefail

dir="${RUNNER_TEMP:?RUNNER_TEMP is not set; this script is for GitHub Actions}"
action="$1"
name="$2"
shift 2

case "$action" in
  start)
    rm -f "$dir/$name.status"
    # The status file is written only once CMD exits, so `wait` can poll for it.
    nohup bash -c '"$@" > "$0.log" 2>&1; echo $? > "$0.status"' "$dir/$name" "$@" >/dev/null 2>&1 &
    ;;
  wait)
    until [[ -s "$dir/$name.status" ]]; do sleep 1; done
    cat "$dir/$name.log"
    exit "$(cat "$dir/$name.status")"
    ;;
  *)
    echo "Usage: $0 start NAME CMD... | wait NAME" >&2
    exit 2
    ;;
esac
