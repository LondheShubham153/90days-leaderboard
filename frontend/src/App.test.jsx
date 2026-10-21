import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App, { ProgressStrip, Streak } from './App.jsx';

const learner = (rank, login, score, extra = {}) => ({
  rank, login, score, avatar_url: '', total_commits: 5, active_days: 4, current_streak: 0, longest_streak: 2, last_active: '', ...extra,
});

const board = {
  total: 5,
  learners: [
    learner(1, 'alpha', 120, { current_streak: 5 }),
    learner(2, 'bravo', 90),
    learner(3, 'charlie', 70),
    learner(4, 'delta', 40),
    learner(5, 'echo', 20),
  ],
};
const stats = { learners: 5, total_commits: 25, longest_streak: 5, on_a_streak: 1 };

function mockApi(ok = true) {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (!ok) return { ok: false, status: 500 };
    return { ok: true, json: async () => (String(url).includes('/stats') ? stats : board) };
  }));
}

beforeEach(() => mockApi());
afterEach(() => vi.unstubAllGlobals());

test('renders the podium and standings from the API', async () => {
  render(<App />);
  expect(await screen.findByLabelText('Top three learners')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'alpha' })).toHaveAttribute('href', 'https://github.com/alpha');
  expect(screen.getByRole('link', { name: 'delta' })).toBeInTheDocument();
  expect(screen.getByText('Learners')).toBeInTheDocument();
});

test('filters the standings by login', async () => {
  render(<App />);
  await screen.findByLabelText('Full standings');
  fireEvent.change(screen.getByLabelText('Find a learner'), { target: { value: 'ech' } });
  expect(screen.getByRole('link', { name: 'echo' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'delta' })).not.toBeInTheDocument();
});

test('shows an error with retry when the API is down', async () => {
  mockApi(false);
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the leaderboard API");
  mockApi(true);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.getByLabelText('Top three learners')).toBeInTheDocument());
});

test('ProgressStrip describes progress for screen readers', () => {
  render(<ProgressStrip days={45} />);
  expect(screen.getByRole('img')).toHaveAttribute('aria-label', '45 of 90 days active');
});

test('Streak highlights streaks of three days or more', () => {
  const { container } = render(<Streak current={4} longest={6} />);
  expect(container.firstChild).toHaveClass('hot');
});
