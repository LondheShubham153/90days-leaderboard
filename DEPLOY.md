# Deploy your own copy

Fork this repo, create a project on [Catalyst by Zoho](https://catalyst.zoho.com), and follow these steps. At the end you have the leaderboard running in **Development**, a GitHub Actions pipeline that deploys it, and (optionally) **Production** behind a human approval.

> **Status of this guide.** Every command below was run for real against the project this repo was built on, except the ones marked **Untested**. Nobody has yet followed it end to end on a brand-new project, so if a step surprises you, please open an issue.

**Time:** plan on an hour the first time, most of it waiting for containers and logins.

## Contents

0. [What you need](#0-what-you-need)
1. [Fork and clone](#1-fork-and-clone)
2. [Create the Catalyst project and link the CLI](#2-create-the-catalyst-project-and-link-the-cli)
3. [Connect an AI agent through MCP (optional)](#3-connect-an-ai-agent-through-mcp-optional)
4. [Create the Data Store table](#4-create-the-data-store-table)
5. [Deploy the fetcher function](#5-deploy-the-fetcher-function)
6. [Deploy the API on AppSail](#6-deploy-the-api-on-appsail)
7. [Deploy the frontend on Slate](#7-deploy-the-frontend-on-slate)
8. [Load data and smoke-test](#8-load-data-and-smoke-test)
9. [Schedule the sync](#9-schedule-the-sync)
10. [Set up CI/CD on GitHub](#10-set-up-cicd-on-github)
11. [Promote to Production](#11-promote-to-production)
12. [Make it yours](#12-make-it-yours)
13. [Tear it all down](#13-tear-it-all-down)

---

## 0. What you need

| Need | Check |
| --- | --- |
| A Catalyst account | Students get it free at [catalyst.zoho.com/students](https://catalyst.zoho.com/students). Sign up through that page. |
| Node 20 | `node -v` |
| Docker | `docker version` (the API ships as a container) |
| Git and the GitHub CLI | `gh auth status` (the CLI is optional but the commands below use it) |
| The Catalyst CLI | `npm i -g zcatalyst-cli` then `catalyst -v` |

### Pick your data center once

Your Catalyst account lives in one **data center (DC)**, and every URL and flag depends on it. You choose it when you sign up. Find yours in the address bar of the console.

| DC | `--dc` flag | Console | MCP endpoint | URL suffix |
| --- | --- | --- | --- | --- |
| US | `us` | `console.catalyst.zoho.com` | `https://catalyst.zohomcp.com/mcp/message` | `.com` |
| EU | `eu` | same pattern, `.eu` | `https://catalyst.zohomcp.eu/mcp/message` | `.eu` |
| India | `in` | `console.catalyst.zoho.in` | `https://catalyst.zohomcp.in/mcp/message` | `.in` |
| Australia | `au` | same pattern, `.com.au` | `https://catalyst.zohomcp.com.au/mcp/message` | `.com.au` |
| Canada, Saudi Arabia, Japan, UAE | `catalyst login --dc` takes `ca`, `sa`, `jp`, `uae` | same pattern | `.ca`, `.sa`, `.jp`, `.ae` | same |

> **Heads up.** The global `--dc` flag that the CI workflow uses lists only `us`, `eu`, `in` and `au` in the CLI help. For `ca`, `sa`, `jp` or `uae` the deploy commands may work only from a logged-in terminal. **Untested.**

### Keep a fill-in sheet

You will collect these values as you go. Write them down.

| Value | Where it comes from | Used in |
| --- | --- | --- |
| `ORG_ID` | `catalyst project:list` | step 2, CI |
| `PROJECT_ID` | `catalyst project:list` | step 2, CI |
| `DC` | your data center (`in`, `us`, ...) | steps 2 and 10 |
| `API_URL` | printed by the AppSail deploy (step 6) | steps 7, 8 |
| `WEB_URL` | printed by the Slate deploy (step 7) | sharing |
| `PROD_API_URL`, `PROD_WEB_URL` | step 11 | CI |

---

## 1. Fork and clone

```bash
gh repo fork TrainWithShubham/90days-leaderboard --clone
cd 90days-leaderboard
```

Or fork on GitHub and `git clone` your fork. Then run the app locally once, with demo data and no Catalyst account, to confirm your tools work:

```bash
# terminal 1
cd backend && npm ci && npm run dev          # API on :9000 with demo data

# terminal 2
cd frontend && npm ci && npm run dev         # site on :5173, open http://localhost:5173
```

Stop both servers (`Ctrl+C`) before going on.

---

## 2. Create the Catalyst project and link the CLI

The CLI cannot create a project non-interactively, so create it in the console:

1. Open the console for your DC (see the table above) and sign in.
2. Create a new project. Any name works; this guide uses `leaderboard`.

Then log in and link this folder to it:

```bash
catalyst login --dc <us|eu|in|au|ca|sa|jp|uae>   # opens a browser
catalyst project:list                            # shows ORG_ID and PROJECT_ID
catalyst init --org <ORG_ID> --project <PROJECT_ID> -ni
```

`init` writes `.catalystrc` in the repo root. It is gitignored: it holds your IDs, so never commit it.

Check that `init` did not change the repo's Catalyst config:

```bash
git status --short          # should show nothing (or only .catalystrc, which is ignored)
git diff catalyst.json      # if it rewrote this file, run: git checkout catalyst.json
```

`catalyst.json` should still list the `fetcher` function and the `leaderboard-web` Slate app.

---

## 3. Connect an AI agent through MCP (optional)

You do not need this to deploy. It is what lets an AI agent work in your project, and this repo uses it for the Job Scheduling setup in step 9, for reading function logs, and for function environment variables.

### Claude Code

```text
/plugin install catalyst-by-zoho@claude-plugins-official
/catalyst-by-zoho:switch-dc <US|EU|IN|AU|CA|SA|JP|UAE>
```

Restart Claude Code. The plugin points at the **US** endpoint by default, so skip `switch-dc` only if your account is in the US. If the install command does not match your version, run `/plugin` and search for "catalyst".

### Cursor, Codex, Gemini or any MCP client

Add the server for **your** data center (here, India):

```json
{
  "mcpServers": {
    "catalyst-by-zoho": {
      "type": "streamable-http",
      "url": "https://catalyst.zohomcp.in/mcp/message"
    }
  }
}
```

### Log in

The first call opens a browser login. After you approve, the browser redirects to `http://localhost:<port>/callback?...` and shows **"This site can't be reached"**. That is normal.

1. Copy the **full URL from the address bar**.
2. Paste it to your agent **in the same session**. If you restart first, the login state is gone and you must start over.

### Check the agent is pointed at the right project

Before the agent changes anything, make it prove it:

```text
Using the Catalyst MCP, fetch project <PROJECT_ID> in the Development environment
for org <ORG_ID>, and confirm the project name. Do not change anything.
```

The name must match the project you made in step 2. If the call fails with a region or auth error, your MCP endpoint is for the wrong data center.

Catalyst MCP operates on **live** resources. Keep the agent in Development and decide Production yourself.

---

## 4. Create the Data Store table

The API reads one table. Catalyst cannot create **columns** from the CLI, so do this in the console: **Data Store → Create Table**, named exactly `Learners` (capital L).

Add these columns. [`backend/schema.json`](backend/schema.json) is the source of truth.

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

Do **not** add `ROWID`, `CREATORID`, `CREATEDTIME` or `MODIFIEDTIME`. Catalyst adds them.

> **Easy to miss:** creating the table is not enough. The first version of this project returned `Unknown Table Learners or Unknown Column login` because the table existed with only the system columns. Step 8 checks this for you.

The MCP also has Data Store tools, but creating tables and columns that way is **untested** here.

---

## 5. Deploy the fetcher function

The fetcher is a Catalyst **Job** function: it finds learners' forks of [`TrainWithShubham/90DaysOfDevOps`](https://github.com/TrainWithShubham/90DaysOfDevOps), scores them, and writes to the table.

```bash
catalyst deploy --only functions:fetcher -ni
```

You should see `✔ Catalyst deploy complete!`.

### Set its variables

In the console, open the function `fetcher`, then its configuration, and add environment variables. Add all of them together, because setting variables replaces the whole set.

| Variable | Value | Why |
| --- | --- | --- |
| `MAX_FORKS` | `15` to start | Caps work per run. Raise it once you add a token. |
| `GITHUB_TOKEN` | a GitHub token | Without it GitHub allows 60 requests an hour. |
| `UPSTREAM_REPO` | `owner/repo` (optional) | Defaults to `TrainWithShubham/90DaysOfDevOps`. |
| `COHORT_START` | `YYYY-MM-DD` (optional) | Commits before this date are ignored. Default `2026-01-23`. |

To make the token: GitHub → Settings → Developer settings → Personal access tokens. Public repository data needs **no scopes**.

> **Never paste the token into a chat with an AI agent.** Put it straight into the console.

---

## 6. Deploy the API on AppSail

The API ships as a Docker container.

```bash
# AppSail only accepts linux/amd64. On an Apple Silicon Mac the flag is required.
docker build --platform linux/amd64 -t leaderboard-api:v1 backend
```

Test the image locally before deploying it. One image once crashed on start because a file was missing from it:

```bash
docker run --rm -p 9000:9000 -e STORE=memory leaderboard-api:v1 &
sleep 3 && curl -s localhost:9000/api/health ; echo
docker stop $(docker ps -q --filter ancestor=leaderboard-api:v1)
```

You should see `{"status":"ok","store":"memory"}`. Now deploy:

```bash
catalyst deploy appsail --name leaderboard-api --source docker://leaderboard-api:v1 --port 9000 -ni
```

Note the line `APPSAIL URL : https://leaderboard-api-<id>.development.catalystappsail.<dc>`. That is your **`API_URL`**.

> **The first minute.** A fresh container takes about a minute to start. Until then you will see `AppSail is disabled` or `Execution failed`. Wait and retry.

---

## 7. Deploy the frontend on Slate

Slate bakes the API address into the JavaScript **at build time**, so set it first:

```bash
echo "VITE_API_BASE=<API_URL>" > frontend/.env.production
node scripts/relink-slate.js
catalyst deploy slate leaderboard-web -ni
```

Note the line `App Url(leaderboard-web): https://leaderboard-web-<hash>.onslate.<dc>`. That is your **`WEB_URL`**.

- **Why `relink-slate.js`?** The CLI records the frontend path in `catalyst.json` as an absolute path on your machine. The script rewrites it so the committed file can stay portable. After deploying, restore it: `git checkout catalyst.json`.
- **If the site says "Can't reach the leaderboard API"**, the variable was empty or wrong when it built. Fix `frontend/.env.production`, then deploy again. Editing it after a build does nothing.
- **Untested:** the very first Slate deploy on a brand-new project. [`frontend/.catalyst/slate-config.toml`](frontend/.catalyst/slate-config.toml) exists for it. If the CLI says the app does not exist, try `catalyst slate:link` from the `frontend` folder and tell us what happened.

`.env.production` is gitignored. Do not commit it.

---

## 8. Load data and smoke-test

Run the smoke test. It checks the API, that the table matches `schema.json`, and the leaderboard route, retrying while the container starts:

```bash
sh scripts/smoke.sh <API_URL>
```

Expected:

```console
ok   /api/health  {"status":"ok","store":"catalyst-datastore"}
ok   /api/health/schema  {"table":"Learners","ok":true,"missing":[],"mismatched":[]}
ok   /api/leaderboard  {"total":0,"learners":[]}
```

If `/api/health/schema` returns `503`, the response lists the missing columns. Add them in the console (step 4) and rerun.

Now load the first rows by running the fetcher once from your machine. This writes to your **Development** data:

```bash
# The CLI needs a Node 20 binary to run functions locally
catalyst config:set node20.bin=$(npx -y node@20 -p "process.execPath")
MAX_FORKS=15 catalyst functions:execute fetcher --key test_job -ni
```

Then reload `WEB_URL`. You should see learners.

---

## 9. Schedule the sync

Job Scheduling needs two things: a **job pool** (where jobs run) and a **cron** (when). Both are written down in [`infra/project-template.json`](infra/project-template.json).

| Setting | Value |
| --- | --- |
| Job pool name | `leaderboard_sync` (letters, numbers and underscores only; `leaderboard-sync` is rejected) |
| Pool type and memory | Function, 256 MB |
| Cron name | `sync_leaderboard` |
| Cron type and expression | cron expression `*/30 * * * *` |
| Timezone | yours, e.g. `Asia/Kolkata` |
| Target | function `fetcher` |
| Retries | 1, after 60 seconds |

### Option A: the console

**Job Scheduling → Job pools → create**, then create the cron and point it at `fetcher` and your pool.

### Option B: ask your AI agent (needs step 3)

```text
In Catalyst project <PROJECT_ID> (org <ORG_ID>), Development environment, using the MCP:
1. Create a job pool named leaderboard_sync, type Function, 256 MB.
2. Create a cron job sync_leaderboard with cron expression "*/30 * * * *" in timezone
   <your timezone>, targeting the function "fetcher" in that pool, 1 retry after 60 seconds.
   Create it DISABLED.
3. Run it once with Submit Cron Job, read the job's status, and tell me the result.
4. If the run succeeded, enable the cron.
```

The MCP tools behind this are `Create_Job_Pool`, `Create_Cron_Job`, `Submit_Cron_Job`, `Get_Job_By_Id` and `Update_Cron_Job_Status`.

### Option C: import the template

`catalyst iac:import` can build a project from `infra/project-template.json`. It creates a **new** project, it does not update yours, and it needs the function zip built with `iac:pack`. **Untested.**

> **Confirm the schedule really fires.** After the first `:00` or `:30`, open the cron in the console and check its run counters. During this project's build they still read 0 after scheduled times had passed, so verify yours.
>
> **A job can report `FAILURE` even though rows were written.** The likely cause is GitHub's rate limit stopping the run part-way. Add `GITHUB_TOKEN` (step 5).

---

## 10. Set up CI/CD on GitHub

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main`:

```
test (3 in parallel) → deploy to Development → smoke test → human approval → Production
```

**Do this first.** GitHub disables Actions on forks. Open your fork's **Actions** tab and click **"I understand my workflows, go ahead and enable them"**.

### Create the token, secret, variables and environments

Run the first two lines in **your own terminal**, not through an AI agent. `token:generate` prints a full-access token, and anything an agent runs ends up in its transcript.

```bash
REPO=<your-github-user>/90days-leaderboard

# 1. The token. Confirm the device code in the browser, copy the token it prints.
catalyst token:generate
gh secret set CATALYST_TOKEN -R $REPO          # paste the token at the prompt

# 2. The variables
gh variable set CATALYST_ORG -R $REPO -b "<ORG_ID>"
gh variable set PROJECT_ID   -R $REPO -b "<PROJECT_ID>"
gh variable set CATALYST_DC  -R $REPO -b "<us|eu|in|au>"

# 3. The environments. `production` requires you to approve before it runs.
gh api -X PUT repos/$REPO/environments/development --silent
echo "{\"reviewers\":[{\"type\":\"User\",\"id\":$(gh api user --jq .id)}],\"prevent_self_review\":false}" \
  | gh api -X PUT repos/$REPO/environments/production --input -
```

| Name | Kind | Required | Purpose |
| --- | --- | --- | --- |
| `CATALYST_TOKEN` | secret | yes | CLI token from `catalyst token:generate` |
| `CATALYST_ORG` | variable | yes | Your org ID |
| `PROJECT_ID` | variable | yes | Your project ID |
| `CATALYST_DC` | variable | yes | `us`, `eu`, `in` or `au`. If unset the workflow assumes `us`. |
| `PROD_API_URL` | variable | for Production | Leave unset until step 11; `deploy-prod` is skipped without it |
| `DEV_API_URL` | variable | no | Fallback only. The deploy reads the AppSail URL from its own output. |

Required reviewers on a **private** repo need a paid GitHub plan; public repos are free.

Revoke old tokens any time with `catalyst token:list` and `catalyst token:revoke <id>`.

### Run it

```bash
git commit --allow-empty -m "Trigger the first pipeline run" && git push
gh run watch -R $REPO
```

You want every job green. This project's first full run took about two minutes. If the Slate step prints `Deploy is Live!` and then `HTTP Error: 400`, the site was already updated; re-run with `gh run rerun <id> --failed`.

---

## 11. Promote to Production

Production is a separate copy: its own URLs, its own services and its own **empty** table. The decision to promote is yours, not the agent's.

1. **Create and promote.** In the console, create the **Production** environment for your project and promote Development to it. This copies your services. It did **not** copy the Slate app in this project, and it did not copy any data.
2. **Deploy the frontend to Production** with the **production** API URL. It is your `API_URL` without `.development`, for example `https://leaderboard-api-<id>.catalystappsail.<dc>`. Check it with `curl <PROD_API_URL>/api/health`.

   ```bash
   echo "VITE_API_BASE=<PROD_API_URL>" > frontend/.env.production
   node scripts/relink-slate.js
   catalyst deploy slate leaderboard-web --production -ni
   git checkout catalyst.json
   ```

3. **Set the function variables in Production** too (`MAX_FORKS`, `GITHUB_TOKEN`). Environments do not share them.
4. **Run the sync once in Production.** The table starts empty, so the site will say "No learners yet" until you do. Use the console, or ask your agent to run the cron in the **Production** environment. A Production job pool has a **different ID** from the Development one, and using the wrong ID makes the run report `FAILURE`.
5. **Turn on the pipeline's Production job:**

   ```bash
   gh variable set PROD_API_URL -R $REPO -b "<PROD_API_URL>"
   ```

From the next push, the run pauses at `deploy-prod` until the reviewer on the `production` environment approves.

> **Untested:** the pipeline's own Production step (`catalyst deploy --production`). This project promoted from the console and deployed Slate to Production with the CLI, as above.

---

## 12. Make it yours

- **Brand:** replace the files in `frontend/public/` (`rocket.png`, `tws-logo.png`, the favicons) and change the color tokens at the top of `frontend/src/styles.css`. The page text is in `frontend/src/App.jsx`.
- **Different community:** set `UPSTREAM_REPO` on the function to a repo whose forks you want to rank, and `COHORT_START` to your start date.
- **README:** the live links near the top point at the original deployment. Replace them with yours.

---

## 13. Tear it all down

To stop using Catalyst resources, remove them in this order. **The CLI cannot delete most of them.**

| Resource | How |
| --- | --- |
| Cron and job pool | Console, or MCP `Delete_Cron_Job` then `Delete_Job_Pool` |
| Slate app `leaderboard-web` | Console |
| AppSail service `leaderboard-api` | Console |
| Function `fetcher` | Console, or interactively: `catalyst functions:delete fetcher --remote` (it refuses non-interactive mode) |
| Table `Learners` | Console. This deletes the data. |
| The project itself | Console. Only if it holds nothing else you need. |

Also revoke the CLI token (`catalyst token:revoke <id>`) and delete the `CATALYST_TOKEN` secret.

---

## If something goes wrong

The README has a [troubleshooting table](README.md#troubleshooting) with the errors this project actually hit. The quickest checks:

```bash
curl -s <API_URL>/api/health/schema     # is the table what the code expects?
curl -s <API_URL>/api/stats             # is there any data at all?
```
