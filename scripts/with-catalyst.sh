#!/usr/bin/env sh
# Run a command with the Catalyst CLI on PATH. Catalyst's default pipeline image does not have `catalyst`
# available to job scripts, so install a pinned version from npm into a local folder (no root needed).
# Run it under scripts/with-node20.sh so the CLI uses Node 20.
# Usage: sh scripts/with-node20.sh sh scripts/with-catalyst.sh <command> [args...]
set -eu

version="${CATALYST_CLI_VERSION:-1.28.0}"
dir="${CATALYST_CLI_DIR:-${TMPDIR:-/tmp}/catalyst-cli}"
if [ ! -x "$dir/node_modules/.bin/catalyst" ]; then
  npm install --prefix "$dir" --no-audit --no-fund --loglevel=error "zcatalyst-cli@$version"
fi

PATH="$dir/node_modules/.bin:$PATH"
export PATH
echo "using catalyst $(catalyst --version 2>&1 | tail -1)"

exec "$@"
