'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const CACHE_MS = 30 * 1000;

function rank(learners) {
  return [...learners]
    .sort((a, b) => b.score - a.score || b.longest_streak - a.longest_streak || a.login.localeCompare(b.login))
    .map((l, i) => ({ rank: i + 1, ...l }));
}

// Strip the per-day history from list responses; it is only needed for one learner.
const summary = ({ days, ...rest }) => rest;

function createApp(store, { corsOrigin = '*' } = {}) {
  const app = express();
  app.disable('x-powered-by');
  // AppSail's gateway already sends X-Frame-Options and HSTS; a second copy would conflict.
  app.use(helmet({ frameguard: false, hsts: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: corsOrigin }));

  let cache = { at: 0, ranked: [] };
  async function ranked(req) {
    if (Date.now() - cache.at > CACHE_MS) {
      cache = { at: Date.now(), ranked: rank(await store.listLearners(req)) };
    }
    return cache.ranked;
  }

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', store: store.name }));

  // 200 when the table matches schema.json, 503 when columns are missing — handy as a deploy smoke test.
  app.get('/api/health/schema', async (req, res, next) => {
    try {
      const result = await store.checkSchema(req);
      res.status(result.ok ? 200 : 503).json(result);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/leaderboard', async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const all = await ranked(req);
      res.json({ total: all.length, learners: all.slice(0, limit).map(summary) });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/learners/:login', async (req, res, next) => {
    try {
      const login = req.params.login.toLowerCase();
      const learner = (await ranked(req)).find((l) => l.login.toLowerCase() === login);
      if (!learner) return res.status(404).json({ error: 'learner not found' });
      res.json({ ...learner, days: JSON.parse(learner.days || '[]') });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/stats', async (req, res, next) => {
    try {
      const all = await ranked(req);
      res.json({
        learners: all.length,
        total_commits: all.reduce((a, l) => a + l.total_commits, 0),
        longest_streak: all.reduce((a, l) => Math.max(a, l.longest_streak), 0),
        on_a_streak: all.filter((l) => l.current_streak >= 3).length,
      });
    } catch (err) {
      next(err);
    }
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('request failed:', err);
    res.status(500).json({ error: 'internal error' });
  });

  return app;
}

module.exports = { createApp, rank };
