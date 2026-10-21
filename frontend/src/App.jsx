import { useEffect, useMemo, useState } from 'react';
import { fetchLeaderboard, fetchStats } from './api.js';

const CHALLENGE_DAYS = 90;

function useLeaderboard() {
  const [state, setState] = useState({ status: 'loading', learners: [], stats: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, status: 'loading' }));
    Promise.all([fetchLeaderboard(), fetchStats()])
      .then(([board, stats]) => live && setState({ status: 'ready', learners: board.learners, stats }))
      .catch(() => live && setState({ status: 'error', learners: [], stats: null }));
    return () => {
      live = false;
    };
  }, [attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

export function ProgressStrip({ days }) {
  const filled = Math.min(days, CHALLENGE_DAYS);
  return (
    <div
      className="strip"
      role="img"
      aria-label={`${days} of ${CHALLENGE_DAYS} days active`}
      style={{ '--p': `${(filled / CHALLENGE_DAYS) * 100}%` }}
    >
      <span />
    </div>
  );
}

export function Streak({ current, longest }) {
  return (
    <span className={`streak ${current >= 3 ? 'hot' : ''}`} title={`Longest streak: ${longest} days`}>
      <i aria-hidden="true">▲</i> {current}
      <small>d</small>
    </span>
  );
}

function Avatar({ login, src }) {
  return <img className="avatar" src={src || `https://github.com/${login}.png`} alt="" loading="lazy" width="44" height="44" />;
}

function Podium({ learners }) {
  const order = [learners[1], learners[0], learners[2]].filter(Boolean);
  return (
    <ol className="podium" aria-label="Top three learners">
      {order.map((l) => (
        <li key={l.login} className={`step place-${l.rank}`} style={{ '--i': l.rank }}>
          <span className="place">{String(l.rank).padStart(2, '0')}</span>
          <Avatar login={l.login} src={l.avatar_url} />
          <a href={`https://github.com/${l.login}`} target="_blank" rel="noreferrer">
            {l.login}
          </a>
          <b className="score">{l.score}</b>
          <Streak current={l.current_streak} longest={l.longest_streak} />
        </li>
      ))}
    </ol>
  );
}

function StatsBar({ stats }) {
  const items = [
    ['Learners', stats.learners],
    ['Commits', stats.total_commits],
    ['Best streak', `${stats.longest_streak}d`],
    ['On a streak', stats.on_a_streak],
  ];
  return (
    <dl className="stats">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function App() {
  const { status, learners, stats, retry } = useLeaderboard();
  const [query, setQuery] = useState('');

  const rest = useMemo(() => {
    const q = query.trim().toLowerCase();
    return learners.filter((l) => l.rank > 3 && l.login.toLowerCase().includes(q));
  }, [learners, query]);

  return (
    <main>
      <header className="masthead">
        <p className="kicker">TrainWithShubham × Catalyst by Zoho</p>
        <h1>
          #90Days<span>Of</span>DevOps
          <em>Leaderboard</em>
        </h1>
      </header>

      {status === 'loading' && <p className="note" role="status">Fetching the standings…</p>}

      {status === 'error' && (
        <div className="note error" role="alert">
          Can't reach the leaderboard API.
          <button onClick={retry}>Retry</button>
        </div>
      )}

      {status === 'ready' && learners.length === 0 && (
        <p className="note">No learners yet — the first sync hasn't run.</p>
      )}

      {status === 'ready' && learners.length > 0 && (
        <>
          <StatsBar stats={stats} />
          <Podium learners={learners.slice(0, 3)} />

          <section className="board" aria-label="Full standings">
            <div className="board-head">
              <h2>Standings</h2>
              <input
                type="search"
                placeholder="Find a learner…"
                aria-label="Find a learner"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <ol>
              {rest.map((l) => (
                <li key={l.login} style={{ '--i': Math.min(l.rank, 14) }}>
                  <span className="rank">{String(l.rank).padStart(2, '0')}</span>
                  <Avatar login={l.login} src={l.avatar_url} />
                  <a className="who" href={`https://github.com/${l.login}`} target="_blank" rel="noreferrer">
                    {l.login}
                  </a>
                  <ProgressStrip days={l.active_days} />
                  <Streak current={l.current_streak} longest={l.longest_streak} />
                  <b className="score">{l.score}</b>
                </li>
              ))}
              {rest.length === 0 && <li className="empty">Nobody matches “{query}”.</li>}
            </ol>
          </section>
        </>
      )}

      <footer>
        Score = 10 per active day + 5 per streak day + commits (max 3/day). Synced from learners' forks of
        TrainWithShubham/90DaysOfDevOps.
      </footer>
    </main>
  );
}
