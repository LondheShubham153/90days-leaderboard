'use strict';

const { zcAuth } = require('@zcatalyst/auth');
const { Datastore } = require('@zcatalyst/datastore');
const { diffSchema, describeProblem, schema } = require('../schema');

const TABLE = schema.table;
const PAGE = 300; // ZCQL hard limit per query
const COLUMNS = schema.columns.map((c) => c.name).join(', ');

const num = (v) => Number(v) || 0;

function normalize(row) {
  return {
    login: row.login,
    avatar_url: row.avatar_url,
    total_commits: num(row.total_commits),
    active_days: num(row.active_days),
    current_streak: num(row.current_streak),
    longest_streak: num(row.longest_streak),
    score: num(row.score),
    last_active: row.last_active || '',
    days: row.days || '[]',
  };
}

// AppSail gives us the caller's headers; admin scope lets the API read every row.
async function open(req) {
  const app = await zcAuth.init({ headers: req.headers }, { scope: 'admin' });
  return new Datastore(app);
}

async function checkSchema(req) {
  const datastore = await open(req);
  const columns = await datastore.table(TABLE).getAllColumns();
  return diffSchema(columns.map((c) => ({ name: c.column_name, type: c.data_type })));
}

// Catalyst Data Store behind the same interface as the in-memory store.
function createCatalystStore() {
  return {
    name: 'catalyst-datastore',
    checkSchema,
    async listLearners(req) {
      try {
        const datastore = await open(req);
        const learners = [];
        for (let offset = 0; ; offset += PAGE) {
          const batch = await datastore.executeZCQLQuery(
            `SELECT ${COLUMNS} FROM ${TABLE} ORDER BY score DESC LIMIT ${offset}, ${PAGE}`,
          );
          const rows = batch.map((r) => r[TABLE]).filter(Boolean);
          learners.push(...rows.map(normalize));
          if (rows.length < PAGE) return learners;
        }
      } catch (err) {
        // A bad query is almost always a table that was not set up as schema.json says.
        const problem = await checkSchema(req).catch(() => null);
        if (problem && !problem.ok) throw new Error(describeProblem(problem), { cause: err });
        throw err;
      }
    },
  };
}

module.exports = { createCatalystStore };
