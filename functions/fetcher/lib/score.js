'use strict';

// Learners are mostly in India, so a "day" is an IST calendar day.
const IST_OFFSET_MIN = 330;
const DAY_MS = 24 * 60 * 60 * 1000;

const POINTS_PER_ACTIVE_DAY = 10;
const POINTS_PER_STREAK_DAY = 5;
const MAX_COMMITS_PER_DAY = 3; // keeps one noisy day from dominating

function toDay(iso, offsetMin = IST_OFFSET_MIN) {
  const shifted = new Date(new Date(iso).getTime() + offsetMin * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function dayNumber(day) {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
}

function longestStreak(sortedDays) {
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of sortedDays) {
    const n = dayNumber(day);
    run = prev !== null && n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  return best;
}

// A streak is still "alive" if the last active day is today or yesterday.
function currentStreak(sortedDays, today) {
  if (sortedDays.length === 0) return 0;
  const todayN = dayNumber(today);
  let n = dayNumber(sortedDays[sortedDays.length - 1]);
  if (todayN - n > 1) return 0;
  let run = 1;
  for (let i = sortedDays.length - 2; i >= 0; i--) {
    const prev = dayNumber(sortedDays[i]);
    if (prev !== n - 1) break;
    run += 1;
    n = prev;
  }
  return run;
}

/**
 * Turns a learner's commit timestamps into leaderboard stats.
 * @param {string} login
 * @param {string[]} commitDates ISO timestamps of the learner's own commits
 * @param {{ start: string, today?: string }} opts start is YYYY-MM-DD (cohort start)
 */
function summarize(login, commitDates, { start, today = toDay(new Date().toISOString()) }) {
  const perDay = new Map();
  for (const iso of commitDates) {
    const day = toDay(iso);
    if (day < start || day > today) continue;
    perDay.set(day, (perDay.get(day) || 0) + 1);
  }
  const days = [...perDay.keys()].sort();
  const totalCommits = [...perDay.values()].reduce((a, b) => a + b, 0);
  const cappedCommits = [...perDay.values()].reduce((a, c) => a + Math.min(c, MAX_COMMITS_PER_DAY), 0);
  const longest = longestStreak(days);
  const current = currentStreak(days, today);

  return {
    login,
    total_commits: totalCommits,
    active_days: days.length,
    current_streak: current,
    longest_streak: longest,
    last_active: days.length ? days[days.length - 1] : '',
    score: days.length * POINTS_PER_ACTIVE_DAY + longest * POINTS_PER_STREAK_DAY + cappedCommits,
    days: JSON.stringify(days),
  };
}

module.exports = { summarize, toDay, longestStreak, currentStreak };
