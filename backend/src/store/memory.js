'use strict';

// In-memory store: used for unit tests, CI and `npm run dev` without Catalyst.
// Offline demo avatars: a coloured disc with the learner's initial.
const HUES = [88, 24, 190, 280, 340];
function avatar(login) {
  const hue = HUES[login.length % HUES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(${hue},55%,38%)"/><text x="32" y="43" font-family="sans-serif" font-size="32" font-weight="700" text-anchor="middle" fill="#fff">${login[0].toUpperCase()}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const SEED = [
  { login: 'ada-ops', total_commits: 16, active_days: 9, current_streak: 9, longest_streak: 9, score: 149, last_active: '2026-02-05' },
  { login: 'grace-sre', total_commits: 10, active_days: 4, current_streak: 0, longest_streak: 3, score: 64, last_active: '2026-02-01' },
  { login: 'linus-bash', total_commits: 3, active_days: 3, current_streak: 3, longest_streak: 3, score: 48, last_active: '2026-02-05' },
  { login: 'margaret-k8s', total_commits: 3, active_days: 3, current_streak: 0, longest_streak: 1, score: 38, last_active: '2026-02-02' },
  { login: 'ken-terraform', total_commits: 1, active_days: 1, current_streak: 1, longest_streak: 1, score: 16, last_active: '2026-02-05' },
].map((l) => ({
  ...l,
  avatar_url: avatar(l.login),
  days: JSON.stringify([l.last_active]),
}));

function createMemoryStore(rows = SEED) {
  return {
    name: 'memory',
    async checkSchema() {
      return { table: 'Learners', ok: true, missing: [], mismatched: [] };
    },
    async listLearners() {
      return rows.map((r) => ({ ...r }));
    },
  };
}

module.exports = { createMemoryStore };
