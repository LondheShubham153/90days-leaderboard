#!/usr/bin/env sh
# Post-deploy smoke test: the API is up and the Data Store table matches backend/schema.json.
# A fresh AppSail container can take a minute to start, so retry before giving up.
# Usage: scripts/smoke.sh https://<appsail-url>
set -eu

base="${1:?usage: smoke.sh <api-base-url>}"
base="${base%/}"

check() {
  path="$1"
  for attempt in $(seq 1 24); do
    if curl -fsS -m 15 "$base$path" -o /tmp/smoke.json 2>/dev/null; then
      echo "ok   $path  $(cat /tmp/smoke.json | head -c 120)"
      return 0
    fi
    echo "wait $path (attempt $attempt/24)"
    sleep 5
  done
  echo "FAIL $path never became healthy" >&2
  curl -sS -m 15 "$base$path" >&2 || true
  return 1
}

check /api/health
check /api/health/schema   # 503 with the missing columns if the table drifted
check /api/leaderboard
