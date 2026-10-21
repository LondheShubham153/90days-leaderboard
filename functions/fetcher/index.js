'use strict';

const { zcAuth } = require('@zcatalyst/auth');
const { Datastore } = require('@zcatalyst/datastore');
const { listActiveForks, listOwnCommitDates, mapPool } = require('./lib/github');
const { summarize } = require('./lib/score');

const TABLE = 'Learners';
const CHUNK = 200; // Data Store bulk limit

const config = () => ({
  upstream: process.env.UPSTREAM_REPO || 'TrainWithShubham/90DaysOfDevOps',
  start: process.env.COHORT_START || '2026-01-23',
  token: process.env.GITHUB_TOKEN,
  maxForks: Number(process.env.MAX_FORKS || 300),
});

async function existingRows(datastore) {
  const byLogin = new Map();
  for (let offset = 0; ; offset += 300) {
    const batch = await datastore.executeZCQLQuery(
      `SELECT ROWID, login FROM ${TABLE} ORDER BY ROWID LIMIT ${offset}, 300`,
    );
    const rows = batch.map((r) => r[TABLE]).filter(Boolean);
    rows.forEach((r) => byLogin.set(r.login, r.ROWID));
    if (rows.length < 300) return byLogin;
  }
}

async function upsert(datastore, stats) {
  const table = datastore.table(TABLE);
  const known = await existingRows(datastore);
  const inserts = [];
  const updates = [];
  for (const s of stats) {
    const rowId = known.get(s.login);
    if (rowId) updates.push({ ROWID: rowId, ...s });
    else inserts.push(s);
  }
  for (let i = 0; i < inserts.length; i += CHUNK) await table.insertRows(inserts.slice(i, i + CHUNK));
  for (let i = 0; i < updates.length; i += CHUNK) await table.updateRows(updates.slice(i, i + CHUNK));
  return { inserted: inserts.length, updated: updates.length };
}

module.exports = async (jobRequest, context) => {
  const cfg = config();
  try {
    const app = await zcAuth.init(context);
    const datastore = new Datastore(app);

    const forks = await listActiveForks({ ...cfg, since: cfg.start });
    console.log(`found ${forks.length} active forks of ${cfg.upstream}`);

    const stats = (
      await mapPool(forks, 5, async (fork) => {
        const dates = await listOwnCommitDates(fork, cfg.start, cfg.token);
        const s = summarize(fork.owner.login, dates, { start: cfg.start });
        return s.active_days > 0 ? { ...s, avatar_url: fork.owner.avatar_url } : null;
      })
    ).filter(Boolean);

    const result = await upsert(datastore, stats);
    console.log(`leaderboard sync done: ${JSON.stringify(result)} from ${stats.length} learners`);
    context.closeWithSuccess();
  } catch (err) {
    console.error('leaderboard sync failed:', err);
    context.closeWithFailure();
  }
};
