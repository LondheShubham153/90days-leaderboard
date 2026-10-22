#!/usr/bin/env node
'use strict';

// `catalyst deploy` replaces a function's environment variables with the env_variables in its
// catalyst-config.json, which is empty in git (secrets must not be committed). Fill it in from the
// pipeline's own variables, on the runner only, so a deploy never wipes GITHUB_TOKEN or MAX_FORKS.
// Values are read from the environment and never printed.
const fs = require('node:fs');
const path = require('node:path');

const file = path.resolve(__dirname, '..', 'functions', 'fetcher', 'catalyst-config.json');
const config = JSON.parse(fs.readFileSync(file, 'utf8'));

const wanted = ['GITHUB_TOKEN', 'MAX_FORKS', 'UPSTREAM_REPO', 'COHORT_START'];
const vars = Object.fromEntries(wanted.filter((k) => process.env[k]).map((k) => [k, process.env[k]]));

if (!vars.GITHUB_TOKEN) {
  console.error('GITHUB_TOKEN is not set; the fetcher would be rate limited to 60 GitHub requests an hour.');
  process.exit(1);
}

config.deployment.env_variables = vars;
fs.writeFileSync(file, `${JSON.stringify(config, null, '\t')}\n`);
console.log(`fetcher env -> ${Object.keys(vars).join(', ')}`);
