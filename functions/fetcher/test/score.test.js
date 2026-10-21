'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { summarize, toDay, longestStreak, currentStreak } = require('../lib/score');

const opts = { start: '2026-01-23', today: '2026-02-05' };

test('toDay buckets timestamps into IST days', () => {
  assert.equal(toDay('2026-02-01T20:00:00Z'), '2026-02-02'); // 01:30 IST next day
  assert.equal(toDay('2026-02-01T10:00:00Z'), '2026-02-01');
});

test('longestStreak finds the longest consecutive run', () => {
  assert.equal(longestStreak(['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-07', '2026-02-08']), 3);
  assert.equal(longestStreak([]), 0);
});

test('currentStreak is alive through yesterday and dead after a gap', () => {
  assert.equal(currentStreak(['2026-02-03', '2026-02-04'], '2026-02-05'), 2);
  assert.equal(currentStreak(['2026-02-01', '2026-02-02'], '2026-02-05'), 0);
  assert.equal(currentStreak([], '2026-02-05'), 0);
});

test('summarize scores active days, streak and capped commits', () => {
  const commits = [
    '2026-02-01T10:00:00Z', '2026-02-01T11:00:00Z', '2026-02-01T12:00:00Z', '2026-02-01T13:00:00Z', // 4 -> capped to 3
    '2026-02-02T10:00:00Z',
    '2026-02-04T10:00:00Z',
  ];
  const s = summarize('octocat', commits, opts);
  assert.equal(s.total_commits, 6);
  assert.equal(s.active_days, 3);
  assert.equal(s.longest_streak, 2);
  assert.equal(s.current_streak, 0 + 1); // only 02-04 is within a day of 02-05
  assert.equal(s.score, 3 * 10 + 2 * 5 + (3 + 1 + 1));
  assert.deepEqual(JSON.parse(s.days), ['2026-02-01', '2026-02-02', '2026-02-04']);
});

test('summarize ignores commits before the cohort start', () => {
  const s = summarize('octocat', ['2025-12-01T10:00:00Z', '2026-01-10T10:00:00Z'], opts);
  assert.equal(s.active_days, 0);
  assert.equal(s.score, 0);
});
