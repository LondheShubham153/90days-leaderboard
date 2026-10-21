'use strict';

const API = 'https://api.github.com';

async function gh(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': '90days-leaderboard',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 409 || res.status === 404) return []; // empty or missing repo
  if (!res.ok) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    throw new Error(`GitHub ${res.status} for ${path} (rate remaining: ${remaining})`);
  }
  return res.json();
}

/**
 * Forks that have been pushed to since the cohort started. A fork that was never
 * pushed after creation has nothing a learner wrote.
 */
async function listActiveForks({ upstream, since, token, maxForks, maxPages = 100 }) {
  const active = [];
  for (let page = 1; page <= maxPages && active.length < maxForks; page++) {
    const forks = await gh(`/repos/${upstream}/forks?sort=newest&per_page=100&page=${page}`, token);
    if (forks.length === 0) break;
    for (const f of forks) {
      if (f.pushed_at > f.created_at && f.pushed_at >= since) active.push(f);
    }
  }
  return active.slice(0, maxForks);
}

/** Commit timestamps authored by the fork's owner since the cohort start. */
async function listOwnCommitDates(fork, since, token, maxPages = 3) {
  const login = fork.owner.login;
  const dates = [];
  for (let page = 1; page <= maxPages; page++) {
    const commits = await gh(
      `/repos/${fork.full_name}/commits?author=${encodeURIComponent(login)}&since=${since}&per_page=100&page=${page}`,
      token,
    );
    for (const c of commits) dates.push(c.commit.author.date);
    if (commits.length < 100) break;
  }
  return dates;
}

// Small worker pool so we stay well inside GitHub's secondary rate limits.
async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = await fn(items[i]);
      } catch (err) {
        console.warn(`skipping ${items[i].full_name}: ${err.message}`);
        results[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

module.exports = { listActiveForks, listOwnCommitDates, mapPool };
