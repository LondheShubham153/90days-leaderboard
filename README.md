<div align="center">

# #90DaysOfDevOps Leaderboard

**A three-tier app on [Catalyst by Zoho](https://catalyst.zoho.com), built by an AI agent and shipped to Production by a human.**
It reads learners' GitHub activity, stores it, and ranks who is consistent and who is on a streak.

![License: MIT](https://img.shields.io/badge/license-MIT-c6ff3d?style=flat-square)
![Node 20](https://img.shields.io/badge/node-20-339933?style=flat-square&logo=node.js&logoColor=white)
![React 18](https://img.shields.io/badge/react-18-61dafb?style=flat-square&logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/docker-linux%2Famd64-2496ed?style=flat-square&logo=docker&logoColor=white)
![Catalyst](https://img.shields.io/badge/catalyst-AppSail%20%C2%B7%20Slate%20%C2%B7%20Data%20Store-ff6a00?style=flat-square)

<img src="docs/screenshots/leaderboard-production.png" alt="The live leaderboard: podium for the top three, a stats strip, and a standings table with 90-day progress strips" width="760">

*The Production deployment with live GitHub data from learners' public forks.*

</div>

---

## What this repo teaches

This is the demo repo for the *"AI Agent se Production tak"* video from **TrainWithShubham**. It is also a worked example for anyone learning Catalyst: every service below is used by real code in this repo, and every command in this README was run for real.

| You want to learn | Catalyst service | Where it lives here |
| --- | --- | --- |
| Store data and query it | **Data Store** | [`backend/schema.json`](backend/schema.json), [`backend/src/store/catalyst.js`](backend/src/store/catalyst.js) |
| Run short background code | **Functions** (Job) | [`functions/fetcher/`](functions/fetcher) |
| Run an always-on API in a container | **AppSail** | [`backend/Dockerfile`](backend/Dockerfile) |
| Host a React frontend | **Slate** | [`frontend/`](frontend) |
| Run code on a timer | **Job Scheduling** | [`infra/project-template.json`](infra/project-template.json) |
| Test, deploy and gate Production | CI/CD | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) |
| Keep Dev and Production apart | **Environments** | [Dev vs Production](#development-vs-production) |
| Let an AI agent work safely | **MCP + CLI** | [Working with an AI agent](#working-with-an-ai-agent) |

**Want your own copy?** Follow [DEPLOY.md](DEPLOY.md): fork, create a Catalyst project, deploy, and set up CI, with every command in order.

**New to Catalyst?** Read [LEARN.md](LEARN.md) first. It explains the concepts from scratch, using this repo as the example.

## See it running

The live site, built from this repo and deployed to Catalyst (India data center, Development environment):

- **Site:** <https://90daysofdevops-leaderboard.onslate.in>
- **API health:** <https://leaderboard-api-50047086134.development.catalystappsail.in/api/health>

A push to `main` runs tests, deploys to Development, smoke-tests it, and then waits for a person before Production:

<img src="docs/screenshots/ci-run.png" alt="GitHub Actions run: three test jobs, deploy-dev, smoke-dev all green, deploy-prod skipped" width="760">

*The first end-to-end run: about two minutes. `deploy-prod` is skipped until the `PROD_API_URL` variable is set.*

### The same flow on Catalyst Pipelines

[`catalyst-pipelines.yml`](catalyst-pipelines.yml) runs the flow inside Catalyst itself: `preflight` (checks the pipeline variables), tests, deploy to Development, and a smoke test. Run `dev-90days-leaderboard` from the console, or with the MCP's `Execute_Pipeline_Manually`.

<p>
<img src="docs/screenshots/catalyst-pipeline-test.png" alt="Catalyst Pipelines run: preflight, test-backend, test-fetcher and test-frontend all SUCCESS" width="380">
<img src="docs/screenshots/catalyst-pipeline-deploy.png" alt="Catalyst Pipelines run: deploy-fetcher, deploy-api, deploy-web and smoke-dev all SUCCESS" width="380">
</p>

*Run `101294000000033013`, Development: `preflight` and the three test jobs, then `deploy-fetcher`, `deploy-api`, `deploy-web` and `smoke-dev`, all green. Production promotion is not wired up.*

## How it works

```mermaid
flowchart LR
    GH[("GitHub<br/>learners' forks of<br/>90DaysOfDevOps")] -->|commits| JOB
    CRON(["Job Scheduling<br/>every 30 min"]) --> JOB
    subgraph Catalyst by Zoho
        JOB["Job function<br/><b>fetcher</b>"] -->|upsert| DS[("Data Store<br/>Learners")]
        API["AppSail<br/><b>Express API</b><br/>Docker container"] -->|ZCQL| DS
        WEB["Slate<br/><b>React app</b>"] -->|fetch /api| API
    end
    User((Browser)) --> WEB
```

1. The **fetcher** (a Catalyst Job function) finds active forks of [`TrainWithShubham/90DaysOfDevOps`](https://github.com/TrainWithShubham/90DaysOfDevOps), takes each learner's own commits, scores them, and upserts one row per learner.
2. The **API** (Express in a Docker container on AppSail) reads those rows and serves the ranking.
3. The **frontend** (React + Vite on Slate) renders the podium, stats and standings.

### Scoring

| Signal | Points |
| --- | --- |
| Each active day (a day with at least one commit) | 10 |
| Each day of your longest streak | 5 |
| Each commit, up to 3 per day | 1 |

Days are IST calendar days. A streak stays alive through yesterday, so it only resets after a full missed day.

## Development vs Production

Catalyst gives a project separate **environments**. Each has its own URLs, its own data and its own copy of every service.

```mermaid
flowchart LR
    A["AI agent<br/>+ you"] -->|deploys| DEV
    subgraph DEV["Development"]
        D1["AppSail · Slate · Function"] --- D2[("Learners<br/>own data")]
    end
    DEV -->|"human approves"| PROD
    subgraph PROD["Production"]
        P1["AppSail · Slate · Function"] --- P2[("Learners<br/>own data")]
    end
```

What that looked like in this project:

| | Development | Production |
| --- | --- | --- |
| API URL | `leaderboard-api-<id>.development.catalystappsail.in` | `leaderboard-api-<id>.catalystappsail.in` |
| Slate URL | `leaderboard-web-<hash>.onslate.in` | a different `<hash>` |
| Learners right after promotion | 13 | **0**: the table existed but had no rows |

Promoting to Production copied the services and the empty table, not the data. We had to run the sync in Production on its own. The Slate app was not promoted either and needed its own `catalyst deploy slate --production`.

## The UI and its theme

The frontend uses the TrainWithShubham brand: purple and amber from the TWS logo on black, heavy italic type, the rocket monogram, and the logo's orbit arc behind the title.

| Token | Value | Used for |
| --- | --- | --- |
| `--purple` | `#7a4fc4` | Fills, borders, the progress strips |
| `--lift` | `#a98af0` | Purple **text**, ranks, focus accents |
| `--amber` | `#ffc875` | The winner, streaks, highlights |
| `--ink` / `--panel` | `#0a0710` / `#130e1f` | Page and card backgrounds |

The tokens live at the top of [`frontend/src/styles.css`](frontend/src/styles.css); change them there and the whole app follows.

- **Why two purples?** The brand purple is only 3.5:1 against the black background, below the 4.5:1 that small text needs. Text uses the lighter `--lift` (7.2:1); the brand purple stays on fills and borders. Amber measures 13:1.
- **Fonts:** [Archivo](https://fonts.google.com/specimen/Archivo) (display, expanded italic) and [Barlow](https://fonts.google.com/specimen/Barlow) (body), loaded in [`frontend/index.html`](frontend/index.html).
- **Phones:** below 720px the podium becomes a ranked list with the leader first, and the progress strips are hidden.
- **Motion:** the entrance animations and the drifting rocket stop under `prefers-reduced-motion`.
- **Logo files:** `frontend/public/rocket.png` (the monogram, transparent background, used for the favicon and the hero) and `tws-logo.png` (the full lockup, cropped to the artwork and shown at the top; its black square is hidden on the dark page with `mix-blend-mode: screen`).
- **Links out:** the header button and the footer both point at the [90DaysOfDevOps challenge repo](https://github.com/TrainWithShubham/90DaysOfDevOps).

> **Testing a phone layout in headless Chrome:** its minimum window is about 500px wide, so a 390px capture shows a cropped 500px layout. Load the page in a 390px `<iframe>` instead to see the real mobile layout.

## Quick start (no Catalyst account needed)

The API ships with an in-memory store, so you can run the whole app locally.

```bash
# terminal 1: API on :9000 with demo data
cd backend
npm ci
npm run dev

# terminal 2: frontend on :5173 (proxies /api to :9000)
cd frontend
npm ci
npm run dev
```

Open <http://localhost:5173>. Run the tests with `npm test` in `backend/`, `frontend/` and `functions/fetcher/`.

## Build it on Catalyst: step by step

The chapters follow the video. Each one has the commands, what you should see, and the traps we actually fell into. For a single start-to-finish checklist you can follow on a fork, use [DEPLOY.md](DEPLOY.md).

> **Students:** sign up through [catalyst.zoho.com/students](https://catalyst.zoho.com/students) to use Catalyst for free.

### 1. Set up: account, CLI, project

```bash
npm i -g zcatalyst-cli
catalyst login
catalyst project:list          # note your org and project ID
catalyst init --org <your-org> -p <your-project-id> -ni
```

`init` writes `.catalystrc` (gitignored). The CLI cannot create a project non-interactively, so create it once in the [console](https://console.catalyst.zoho.com).

> **Trap: data center.** Your account lives in one data center (this project: **India**) and every URL depends on it: `.catalystappsail.in`, `.onslate.in`. The CLI defaults to US. Pass `--dc <your-dc>` when you use a token (in CI this is the `CATALYST_DC` variable), and check the suffix of the URL a deploy prints.

### 2. Connect the AI agent: MCP and Agent Skills

Catalyst's MCP server is per data center. For India, point the plugin at `https://catalyst.zohomcp.in/mcp/message` (the plugin's `switch-dc` command does this), restart your agent, then approve the browser login.

> **Trap: the OAuth callback.** After you approve, the browser redirects to `http://localhost:<port>/callback?...` and shows "This site can't be reached". That is normal. Copy the **full URL from the address bar** and give it to your agent in the **same session**. If you restart first, the login state is gone and you must start over.

Check the agent and the CLI agree on the project before you let the agent change anything: ask for the project by ID through the MCP and compare it with `.catalystrc`.

### 3. The database: Data Store

[`backend/schema.json`](backend/schema.json) is the source of truth. In the console, **Data Store → Create Table** named `Learners` (case-sensitive):

| Column | Type | Max length |
| --- | --- | --- |
| `login` | Var Char | 255 |
| `avatar_url` | Var Char | 255 |
| `total_commits` | Int | |
| `active_days` | Int | |
| `current_streak` | Int | |
| `longest_streak` | Int | |
| `score` | Int | |
| `last_active` | Var Char | 255 |
| `days` | Text | |

Do not add `ROWID`, `CREATORID`, `CREATEDTIME` or `MODIFIEDTIME`; Catalyst adds them.

> **Trap: a table is not a schema.** Our first deploy returned `Unknown Table Learners or Unknown Column login` because the table existed with only the system columns. That is why the API has `/api/health/schema`: it compares the live table with `schema.json` and returns `503` with the missing columns.

### 4. The backend on AppSail, as a Docker container

```bash
# AppSail only accepts linux/amd64. On an Apple Silicon Mac this flag is required.
docker build --platform linux/amd64 -t leaderboard-api:v1 backend
catalyst deploy appsail --name leaderboard-api --source docker://leaderboard-api:v1 --port 9000 -ni
```

You should see `✔ Catalyst AppSail Deploy completed successfully` and the service URL. The app must listen on the port in `X_ZOHO_CATALYST_LISTEN_PORT`; [`server.js`](backend/src/server.js) reads it.

> **Trap: the first minute.** A fresh container takes about a minute to start. Until then you will see `AppSail is disabled` or `Execution failed`. Wait, then retry.
>
> **Trap: a crash on start.** One image crashed with `Cannot find module '../schema.json'` because the Dockerfile did not copy it. Run the image locally before you deploy it: `docker run -p 9000:9000 -e STORE=memory leaderboard-api:v1`.

### 5. The frontend on Slate

```bash
echo "VITE_API_BASE=https://<your-appsail-url>" > frontend/.env.production
node scripts/relink-slate.js
catalyst deploy slate leaderboard-web -ni
```

> **Trap: build-time variables.** Vite bakes `VITE_API_BASE` into the JavaScript while it builds. If it was empty or wrong then, the live site says "Can't reach the leaderboard API" until you rebuild and redeploy; editing it afterwards does nothing.
>
> **Why `relink-slate.js`?** The CLI records the frontend path in `catalyst.json` as an absolute path. The script rewrites it for your machine, so the committed file can stay portable.

### 6. The sync: a Job function and Job Scheduling

```bash
catalyst deploy --only functions:fetcher -ni
```

The schedule is a **job pool** (where jobs run) plus a **cron** (when). Both are written down in [`infra/project-template.json`](infra/project-template.json): pool `leaderboard_sync`, cron `sync_leaderboard`, `*/30 * * * *` in `Asia/Kolkata`.

> **Trap: names.** A job pool name allows only letters, numbers and underscores. `leaderboard-sync` was rejected; `leaderboard_sync` worked.
>
> **Trap: IDs differ per environment.** When Production got its own copy of the pool, it also got a new ID. A manual run that used the Development pool's ID reported `FAILURE`; use the pool ID of the environment you are in.
>
> **Trap: the rate limit.** Without a `GITHUB_TOKEN`, GitHub allows 60 requests an hour, so keep `MAX_FORKS` low (we used 15) or add a token.

Load the first data by hand to check it works:

```bash
catalyst config:set node20.bin=$(npx -y node@20 -p "process.execPath")   # the local run needs a Node 20 binary
MAX_FORKS=15 catalyst functions:execute fetcher --key test_job -ni
```

### 7. CI/CD: test, deploy, smoke, approve

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main`:

```
test (3 in parallel) → deploy to Development → smoke test → human approval → Production
```

| Where | Name | Purpose |
| --- | --- | --- |
| Secret | `CATALYST_TOKEN` | CLI token from `catalyst token:generate` |
| Variables | `CATALYST_ORG`, `PROJECT_ID` | Where to deploy |
| Variable | `CATALYST_DC` | Your data center: `us`, `eu`, `in` or `au` (defaults to `us`) |
| Variable | `PROD_API_URL` | Production AppSail URL; `deploy-prod` is skipped until it is set |
| Variable | `DEV_API_URL` | Optional fallback; the deploy reads the AppSail URL from its own output |
| Environment | `production` | Add a **required reviewer**: the run pauses there until they approve |

The smoke test is a script you can run anywhere:

```console
$ sh scripts/smoke.sh https://<your-appsail-url>
ok   /api/health  {"status":"ok","store":"catalyst-datastore"}
```

It also checks `/api/health/schema` and `/api/leaderboard`, retrying while the container starts.

> **Trap: your token is a secret.** `catalyst token:generate` prints a full-access token. Run it in your own terminal, put it straight into the secret, and never paste it into a chat or a log. Revoke old ones with `catalyst token:revoke <id>`.
>
> **GitHub Actions or Catalyst Pipelines?** Both run the same flow. GitHub Actions deploys on every push to `main`. [`catalyst-pipelines.yml`](catalyst-pipelines.yml) runs on Catalyst Pipelines, which needs its own variables (see the comment at the top of the file); the default image there has Node 18 and no `catalyst` command, so the file installs Node 20 and a pinned CLI itself.

### 8. Promote to Production, with a human in the loop

1. In the Catalyst console, create the **Production** environment and promote your Development services to it.
2. Deploy the frontend to Production with its own API URL: `catalyst deploy slate leaderboard-web --production -ni`.
3. Run the sync once in Production, because the table starts empty.
4. Set the repo variable `PROD_API_URL`. From then on `deploy-prod` waits for the `production` reviewer.

### 9. Logs, monitoring and debugging

When something breaks, check in this order: the service's own status, then its logs, then the dependency behind it.

```bash
curl -s https://<your-appsail-url>/api/health/schema    # is the table what the code expects?
curl -s https://<your-appsail-url>/api/stats            # is there any data at all?
```

A real example from this project: after the first run in Production, both sync jobs reported `FAILURE` even though rows had been written. The likely cause is GitHub's rate limit stopping the job part-way, but we have not confirmed it, because the function's logs came back empty when queried through the API. Use the **Logs** page in the console for the real evidence.

## Infrastructure as code

[`infra/project-template.json`](infra/project-template.json) is a Catalyst IaC template, exported with `catalyst iac:export`. It describes the `fetcher` function settings, the `Learners` table and its columns, the job pool, and the 30-minute cron schedule.

- **It creates a new project.** `catalyst iac:import` builds a fresh project from the template; it does not update an existing one. Use it to stand the setup up again, or to review what the schedule is.
- **Not covered:** AppSail and Slate do not appear in the export. Deploy them with the commands above.
- **Not yet tested:** the template comes from a real export, but `iac:import` has not been run against it.
- **Refreshing it:** after you change something in the console, run `catalyst iac:export -ni`, then `catalyst iac:status export`, which asks before it downloads the zip.

## Working with an AI agent

The agent did the typing; a person made every decision that was hard to undo.

| The agent did | A person did |
| --- | --- |
| Wrote the Express API, the React app and the fetcher, with tests | Chose the project, data center and what to build |
| Built and ran the Docker image locally before deploying | Approved each browser login (MCP, CLI token) |
| Deployed to **Development** with the non-interactive CLI (`-ni`) | Created the Data Store table and its columns in the console |
| Created the job pool and cron through the MCP, then tested one run | Decided to promote to **Production** and clicked it |
| Wrote the CI workflow and fixed what broke | Held the secrets and the `production` approval |

Two limits we hit are worth knowing before you hand an agent your account:

- **`-ni` has holes.** Deleting a function remotely is refused in non-interactive mode, the CLI cannot create a project non-interactively, and columns can only be added in the console. Those need a person.
- **Expect a permission check on Production.** The first write to Production was blocked until it was approved explicitly. That is the behavior you want.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `/api/health/schema` returns `503` | The table is missing columns. The response lists them; add them in the console. |
| AppSail answers `AppSail is disabled` or `Execution failed` right after a deploy | The container is still starting. Wait a minute and retry. |
| AppSail rejects the image | It must be `linux/amd64`. Build with `--platform linux/amd64`. |
| The container exits with `Cannot find module` | A file is missing from the image. Run it locally with `docker run` first. |
| Slate shows "Can't reach the leaderboard API" | `VITE_API_BASE` was empty or wrong at build time. Rebuild and redeploy. |
| The production site loads but is empty | Production has its own data. Run the sync there. |
| `catalyst functions:execute` says Node v20 is missing | Run `catalyst config:set node20.bin=<path to a Node 20 binary>`. |
| A CLI call with a token fails or hits the wrong region | Add `--dc in` (or your data center). |
| MCP login ends on "This site can't be reached" | Paste the address-bar URL to the agent in the same session. |
| A job pool name is rejected | Use only letters, numbers and underscores. |
| A manual cron run says `FAILURE` in a new environment | Use that environment's own job pool ID. |
| The sync is slow or stops part-way | Set `GITHUB_TOKEN`, or lower `MAX_FORKS`. |
| `catalyst deploy slate` prints "Deploy is Live!" and then `HTTP Error: 400` | The site was already updated; this was a transient follow-up call. Re-run the job (`gh run rerun <id> --failed`). It passed on the second try here. |

## Status: what is and is not proven

Everything here was run against a real Catalyst project unless listed below.

- **Not yet confirmed:** that the cron fires on its own. The run counters still showed 0 after the first scheduled times had passed. The manual run in Development succeeded; the two in Production reported `FAILURE` although rows were written (see chapter 9).
- **Not set:** a `GITHUB_TOKEN`, so the sync is capped at 15 forks per run and about 60 requests an hour. The upstream repo has thousands of forks.
- **Not run:** `iac:import`, and the CI approval pause. `deploy-prod` is skipped until `PROD_API_URL` is set.

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

## Take the challenge

Fork this repo, add a feature, deploy it on Catalyst, and share it on LinkedIn with **#90DaysOfDevOps** and **#TrainWithShubham**.

Ideas: a weekly leaderboard, a per-learner heatmap page, streak badges, a Slack or Discord digest, Catalyst Authentication so learners can claim their profile, or a `GITHUB_TOKEN` so the sync covers every fork.

## Contributing

Issues and pull requests are welcome. Please run all three test suites before opening a PR.

## Built with

Written by an AI coding agent ([Claude Code](https://claude.com/claude-code)) and shipped by a human: the agent builds in Development, and a person decides what reaches Production.

## License

[MIT](LICENSE) © TrainWithShubham
