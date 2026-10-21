'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { diffSchema, describeProblem, schema } = require('../src/schema');

const system = ['ROWID', 'CREATORID', 'CREATEDTIME', 'MODIFIEDTIME'].map((name) => ({ name, type: 'bigint' }));
const full = schema.columns.map((c) => ({ name: c.name, type: c.type }));

test('a table with every column is ok', () => {
  const r = diffSchema([...system, ...full]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.missing, []);
});

test('a table with only system columns is missing everything', () => {
  const r = diffSchema(system);
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, schema.columns.map((c) => c.name));
});

test('missing and wrongly typed columns are both reported', () => {
  const actual = full.filter((c) => c.name !== 'score').map((c) => (c.name === 'days' ? { ...c, type: 'varchar' } : c));
  const r = diffSchema(actual);
  assert.deepEqual(r.missing, ['score']);
  assert.deepEqual(r.mismatched, [{ name: 'days', expected: 'text', actual: 'varchar' }]);
  assert.match(describeProblem(r), /missing columns: score; days should be text \(is varchar\)/);
});

test('schema.json describes the columns the fetcher writes', () => {
  const written = ['login', 'avatar_url', 'total_commits', 'active_days', 'current_streak', 'longest_streak', 'score', 'last_active', 'days'];
  assert.deepEqual(schema.columns.map((c) => c.name), written);
});
