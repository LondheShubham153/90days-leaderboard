#!/usr/bin/env sh
# Run a command under Node 20. Catalyst's default pipeline image ships Node 18 and an `images:` entry would
# need registry credentials, so fetch Node 20 from npm (the `node` package) instead.
# Usage: scripts/with-node20.sh <command> [args...]
set -eu

dir="${NODE20_DIR:-${TMPDIR:-/tmp}/node20}"
if [ ! -x "$dir/node_modules/.bin/node" ]; then
  npm install --prefix "$dir" --no-audit --no-fund --loglevel=error node@20
fi

PATH="$dir/node_modules/.bin:$PATH"
export PATH

major=$(node -p "process.versions.node.split('.')[0]")
if [ "$major" -lt 20 ]; then
  echo "Node 20+ required, got $(node -v)" >&2
  exit 1
fi
echo "using node $(node -v)"

exec "$@"
