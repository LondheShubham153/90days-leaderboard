# Reference

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Liveness and which store is active |
| `GET /api/health/schema` | `200` if the table matches `schema.json`, `503` with the missing columns otherwise |
| `GET /api/leaderboard?limit=50` | Ranked learners (max 200) |
| `GET /api/learners/:login` | One learner, including their active days |
| `GET /api/stats` | Cohort totals |

## Configuration

| Where | Variable | Default | Meaning |
| --- | --- | --- | --- |
| API | `STORE` | Data Store | Set to `memory` for demo data |
| API | `CORS_ORIGIN` | `*` | Allowed browser origin |
| API | `X_ZOHO_CATALYST_LISTEN_PORT` / `PORT` | `9000` | AppSail injects the first |
| Fetcher | `GITHUB_TOKEN` | none | Avoids the 60 requests/hour anonymous limit |
| Fetcher | `UPSTREAM_REPO` | `TrainWithShubham/90DaysOfDevOps` | Repo whose forks are scanned |
| Fetcher | `COHORT_START` | `2026-01-23` | Commits before this date are ignored |
| Fetcher | `MAX_FORKS` | `300` | Forks processed per run |
| Frontend | `VITE_API_BASE` | same origin | API URL, set at build time |

## Project structure

```
.
├── backend/               Express API, Dockerfile, schema.json, store implementations
├── frontend/              React + Vite app deployed to Slate (theme in src/styles.css, logos in public/)
├── functions/fetcher/     Job function: GitHub → scores → Data Store
├── infra/                 Catalyst IaC template: schedule, job pool, table
├── scripts/
│   ├── smoke.sh           Post-deploy health and schema check
│   └── relink-slate.js    Fixes the absolute Slate path catalyst.json records
├── .github/workflows/     CI/CD: test, deploy, smoke, approve
├── catalyst.json          Catalyst project resources
└── catalyst-pipelines.yml   Same flow for Catalyst Pipelines (run on Development)
```
