#!/usr/bin/env sh
# Preflight for the Catalyst pipeline: report which variables are missing, without printing any value.
# A variable that was never defined may reach the job as empty or as the literal "<< env.NAME >>",
# so both count as missing. Pass the variables as the environment of this script.
set -u

missing=""
for name in CATALYST_TOKEN CATALYST_ORG CATALYST_DC PROJECT_ID DEV_API_URL GITHUB_TOKEN MAX_FORKS; do
  eval "value=\${$name:-}"
  case "$value" in
    ""|"<<"*) missing="$missing $name"; echo "MISSING  $name" ;;
    *) echo "ok       $name" ;;
  esac
done

case "${DEV_API_URL:-}" in
  https://*) ;;
  *) echo "BAD      DEV_API_URL should start with https://" ;;
esac
case "${CATALYST_DC:-}" in
  us|eu|in|au) ;;
  *) echo "BAD      CATALYST_DC should be one of us, eu, in, au" ;;
esac

echo "node $(node -v), npm $(npm -v), $(catalyst --version 2>&1 | tail -1)"

if [ -n "$missing" ]; then
  echo "Set these pipeline variables in the console and run again:$missing" >&2
  exit 1
fi
