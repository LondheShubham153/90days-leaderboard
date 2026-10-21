'use strict';

// Catalyst can only create columns from the console (or the MCP), so we verify instead:
// compare backend/schema.json with what Data Store actually has and say what is missing.
const expected = require('../schema.json');

const SYSTEM_COLUMNS = new Set(['ROWID', 'CREATORID', 'CREATEDTIME', 'MODIFIEDTIME']);

/** @param actual [{ name, type }] columns reported by Data Store */
function diffSchema(actual, schema = expected) {
  const byName = new Map(actual.filter((c) => !SYSTEM_COLUMNS.has(c.name)).map((c) => [c.name, c.type]));
  const missing = schema.columns.filter((c) => !byName.has(c.name)).map((c) => c.name);
  const mismatched = schema.columns
    .filter((c) => byName.has(c.name) && byName.get(c.name) !== c.type)
    .map((c) => ({ name: c.name, expected: c.type, actual: byName.get(c.name) }));
  return { table: schema.table, ok: missing.length === 0 && mismatched.length === 0, missing, mismatched };
}

function describeProblem({ table, missing, mismatched }) {
  const parts = [];
  if (missing.length) parts.push(`missing columns: ${missing.join(', ')}`);
  mismatched.forEach((m) => parts.push(`${m.name} should be ${m.expected} (is ${m.actual})`));
  return `Data Store table ${table} does not match backend/schema.json — ${parts.join('; ')}`;
}

module.exports = { diffSchema, describeProblem, schema: expected };
