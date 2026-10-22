# Status: what is and is not proven

Everything here was run against a real Catalyst project unless listed below.

- **Not yet confirmed:** that the cron fires on its own. The run counters still showed 0 after the first scheduled times had passed. The manual run in Development succeeded; the two in Production reported `FAILURE` although rows were written (see [BUILD.md](BUILD.md), chapter 9).
- **Token and fork cap:** Development runs with a `GITHUB_TOKEN` and `MAX_FORKS=50`. The upstream repo has thousands of forks, so raise it for a full cohort.
- **Not run:** `iac:import`, and the CI approval pause. `deploy-prod` is skipped until `PROD_API_URL` is set.

GitHub Actions and Catalyst Pipelines have both run the flow on Development (see the README). Production promotion is documented, not wired.
