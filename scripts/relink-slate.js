#!/usr/bin/env node
'use strict';

// `catalyst slate:link` records an absolute path in catalyst.json, which is wrong on every
// other machine (a fork, a pipeline runner). Point the Slate app at this checkout's frontend/.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'catalyst.json');
const config = JSON.parse(fs.readFileSync(file, 'utf8'));

if (!Array.isArray(config.slate) || config.slate.length === 0) {
  console.error('catalyst.json has no slate entry; run: catalyst slate:link --source "$PWD/frontend" --name leaderboard-web --framework react-vite -ni');
  process.exit(1);
}

const source = path.join(root, 'frontend');
config.slate.forEach((app) => { app.source = source; });
fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
console.log(`slate source -> ${source}`);
