'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, rank } = require('../src/app');
const { createMemoryStore } = require('../src/store/memory');

async function withServer(fn) {
  const server = createApp(createMemoryStore()).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.close();
  }
}

test('health reports the active store', () =>
  withServer(async (base) => {
    const body = await (await fetch(`${base}/api/health`)).json();
    assert.deepEqual(body, { status: 'ok', store: 'memory' });
  }));

test('leaderboard is ranked by score and hides day history', () =>
  withServer(async (base) => {
    const { total, learners } = await (await fetch(`${base}/api/leaderboard`)).json();
    assert.equal(total, 5);
    assert.deepEqual(learners.map((l) => l.rank), [1, 2, 3, 4, 5]);
    assert.equal(learners[0].login, 'ada-ops');
    assert.ok(learners.every((l, i) => i === 0 || learners[i - 1].score >= l.score));
    assert.equal('days' in learners[0], false);
  }));

test('leaderboard honours limit', () =>
  withServer(async (base) => {
    const { learners } = await (await fetch(`${base}/api/leaderboard?limit=2`)).json();
    assert.equal(learners.length, 2);
  }));

test('learner lookup is case-insensitive and returns days', () =>
  withServer(async (base) => {
    const body = await (await fetch(`${base}/api/learners/LINUS-BASH`)).json();
    assert.equal(body.login, 'linus-bash');
    assert.ok(Array.isArray(body.days));
  }));

test('unknown learner is a 404', () =>
  withServer(async (base) => {
    const res = await fetch(`${base}/api/learners/nobody`);
    assert.equal(res.status, 404);
  }));

test('stats aggregate the cohort', () =>
  withServer(async (base) => {
    const body = await (await fetch(`${base}/api/stats`)).json();
    assert.equal(body.learners, 5);
    assert.equal(body.total_commits, 33);
    assert.equal(body.longest_streak, 9);
    assert.equal(body.on_a_streak, 2);
  }));

test('rank breaks score ties by longest streak', () => {
  const r = rank([
    { login: 'a', score: 10, longest_streak: 1 },
    { login: 'b', score: 10, longest_streak: 4 },
  ]);
  assert.deepEqual(r.map((l) => l.login), ['b', 'a']);
});

test('schema health is ok for a matching store', () =>
  withServer(async (base) => {
    const res = await fetch(`${base}/api/health/schema`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
  }));

test('responses carry security headers and do not advertise Express', () =>
  withServer(async (base) => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  }));

test('CORS is limited to the configured origin', async () => {
  const server = createApp(createMemoryStore(), { corsOrigin: 'https://app.example' }).listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/health`, {
      headers: { Origin: 'https://app.example' },
    });
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://app.example');
  } finally {
    server.close();
  }
});
