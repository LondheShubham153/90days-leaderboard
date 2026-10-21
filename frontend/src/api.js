// Set VITE_API_BASE at build time (Slate builds are static) to the AppSail URL.
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

export const fetchLeaderboard = () => get('/api/leaderboard?limit=200');
export const fetchStats = () => get('/api/stats');
