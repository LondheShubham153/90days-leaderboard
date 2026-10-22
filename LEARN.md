# Learn Catalyst by Zoho with this repo

This guide teaches the core ideas and main services of [Catalyst by Zoho](https://catalyst.zoho.com) using the leaderboard in this repo as the worked example. Each concept points at the file where you can see it in practice, and the gotchas section lists real problems hit while building it.

**Who it's for:** developers who know basic web development and Docker and want a mental model of Catalyst before building on it.

**How to use it:** read Part 1 and Part 2 first, then pick services from Part 3 as you need them. The exercises in Part 5 make good first projects.

---

## Part 1: The mental model

Catalyst is a platform for building and running full-stack apps without managing servers. You compose **services** (database, functions, containers, frontend hosting, scheduling, auth, and more) inside one **project**, and deploy them from one CLI.

```
Organization
└── Project
    ├── Development environment   ← where you build and test
    └── Production environment    ← where real users are; changes are promoted up from Development
```

| Concept | What it is | In this repo |
| --- | --- | --- |
| **Organization** | The account-level container. You can belong to several. | `--org` flag on CLI commands |
| **Project** | One app: its services, data and settings live here. | `.catalystrc` links a folder to a project |
| **Environment** | Development or Production. Resources are created in Development and promoted up. | The pipeline deploys to Development, then waits for approval |
| **Data center (DC)** | The region your account lives in: US, EU, IN, AU, CA, SA, JP or UAE. | Our URLs ended in `.catalystappsail.in` |
| **ZAID** | A project's unique identifier, used in service URLs. Different in Development and Production. | The number in the AppSail URL |
| **Console** | The web UI for creating projects, tables and settings. | Some steps, like table columns, are console-only |
| **CLI** | `catalyst`, the tool that deploys everything. Every command has a non-interactive `-ni` mode for agents and CI. | `catalyst-pipelines.yml` |

### Local, Development, Production

There are three places code runs:

1. **Local**: `catalyst serve` on your machine. Calls to managed services such as Data Store are proxied to your Development environment, so Local has no data of its own.
2. **Development**: the shared testing environment. This is where agents and pipelines deploy.
3. **Production**: the live app. You don't build here. You **promote** a verified Development setup up to it.

That promotion step is the safety valve this repo is built around: an AI agent can work freely in Development while a person decides what reaches Production.

> **Gotcha:** services usually need a one-time "Start Exploring" activation in the console before they can be deployed to Production, and Production requires billing.

### Your data center decides your URLs

Your account's DC changes every URL, including the MCP server endpoint. Don't assume US:

| Service | URL pattern |
| --- | --- |
| AppSail (Development) | `https://<service>-<ZAID>.development.catalystappsail.<dc>` |
| AppSail (Production) | `https://<service>-<ZAID>.catalystappsail.<dc>` |
| Slate | `https://<subdomain>.onslate.<dc>` (`com` for US, `in`, `eu`, `au`, `ca`) |

If something that should work returns confusing auth errors, check the DC first. We initially assumed US, and the `.in` in the deploy URL revealed it was India.

---

## Part 2: Pick the right service

| You need to... | Use | Why |
| --- | --- | --- |
| Store structured rows and query them | **Data Store** | Relational tables with a SQL-like language (ZCQL) |
| Store key-value items with a flexible schema | **NoSQL** | Typed items in tables with a required partition key; no joins or ZCQL |
| Run a short piece of code on a request, event or schedule | **Functions** | Pay per execution, no server to run |
| Run a full web server or any container | **AppSail** | Persistent process, any language via Docker |
| Host a frontend (React, Vue, Next.js, static) | **Slate** | Builds and deploys your frontend |
| Run something on a timer or as background work | **Job Scheduling** | Job pools plus cron schedules |
| Test and deploy automatically on every push | **Pipelines** | A YAML file with stages, jobs and an approval job |
| Sign users in | **Authentication** | Hosted or embedded login, user management |
| Speed up reads or share short-lived state | **Cache** | In-memory key-value store with a TTL, grouped into segments |
| Store files and objects | **Stratus** | Object storage with buckets and signed URLs (its own API, not S3-compatible) |
| React to things happening in the platform | **Signals** | Event-driven triggers (replaces the older Event Listeners) |

**Functions or AppSail?** The docs' rule of thumb: Functions are stateless handlers, billed per call, with Catalyst-specific templates. AppSail is a persistent server, billed per instance uptime, with any framework and no Catalyst-specific structure. Pick AppSail when you already have a web app or need a container.

---

## Part 3: The main services

### Data Store

A relational database. You define **tables** and **columns**, then read and write rows with an SDK or with **ZCQL**, Catalyst's SQL-like language.

**Things to know**

- Every table gets four system columns automatically: `ROWID`, `CREATORID`, `CREATEDTIME`, `MODIFIEDTIME`. Never create them yourself.
- Column types: `varchar` (needs a max length), `text`, `int`, `bigint`, `double`, `boolean`, `date`, `datetime`, `foreign key`, `encrypted text`.
- **Tables and columns are created in the console** (or through the MCP). The REST API and SDK can read the schema but not create it.
- ZCQL differences from SQL: names are case-sensitive, strings use single quotes only, there are no multi-statement transactions, a `SELECT` returns at most 300 rows (page with `LIMIT offset, count`), and at most 20 columns per `SELECT`.
- Booleans come back as the strings `"true"` and `"false"`, and `"false"` is truthy in JavaScript, so convert on read.
- Emoji and other 4-byte characters are not supported and are stored as `?`.
- `CREATEDTIME` is in the project's timezone with no UTC offset marker, so `new Date()` misreads it.

**Scopes and permissions.** By default the App User role is read-only on a table. Server code can use **admin scope** to bypass that, which is what our API and fetcher do.

**In this repo**

- [`backend/schema.json`](backend/schema.json): the table definition as data.
- [`backend/src/schema.js`](backend/src/schema.js): compares it with the real table.
- [`backend/src/store/catalyst.js`](backend/src/store/catalyst.js): reads with ZCQL, 300 rows per page.
- [`functions/fetcher/index.js`](functions/fetcher/index.js): upserts with `insertRows` and `updateRows`, in chunks of 200.

### Functions

Small units of code Catalyst runs for you. There are several **types**, each with its own handler signature, so never copy code between them:

| Type | Triggered by | Timeout |
| --- | --- | --- |
| Basic I/O | An HTTP request | 30 seconds |
| Advanced I/O | An HTTP request, with a full request/response object | 30 seconds |
| Event | A platform event (use Signals for new work) | 15 minutes |
| Cron | A schedule (legacy; prefer Job) | 15 minutes |
| **Job** | **Job Scheduling** | **15 minutes** |
| Integration | A Zoho service such as Cliq | 30 seconds |
| Browser Logic | SmartBrowz | 30 seconds |

For anything longer than 15 minutes, use AppSail, which has no timeout.

**In this repo:** the `fetcher` is a **Job** function, because syncing hundreds of forks takes far longer than 30 seconds. See [`functions/fetcher/index.js`](functions/fetcher/index.js). It ends with `context.closeWithSuccess()` or `closeWithFailure()`, which is how Catalyst knows the job is done.

**Run one locally:** `catalyst functions:execute fetcher --key test_job -ni`, where the input comes from `catalyst-inputs.json`. The CLI needs a Node binary matching the function's stack (Node 20 here).

### AppSail

A persistent backend service. Two flavors:

- **Managed runtime:** you give Catalyst Node.js, Java or Python code and it supplies the runtime.
- **Custom runtime (Docker):** you give it a container image, in any language. **This repo uses this.**

**Rules that matter**

1. **Listen on the injected port.** AppSail passes it in `X_ZOHO_CATALYST_LISTEN_PORT`. Never hardcode a port. ([`backend/src/server.js`](backend/src/server.js))
2. **Start fast.** The process must be listening within 10 seconds of the instance starting.
3. **Images must be `linux/amd64` and OCI-compliant.** ARM images are rejected. On an Apple Silicon Mac, build with `--platform linux/amd64`.
4. Instances scale from 1 to 5, scaling up at 80% utilization. Memory is 256 to 2048 MB per instance.
5. For managed runtimes, `app-config.json` is the source of truth for environment variables: a redeploy replaces anything you set in the console. Avoid `CATALYST` in your own variable names.
6. Deploying a Docker image from the CLI: `catalyst deploy appsail --name <name> --source docker://<image>:<tag> --port <port> -ni`.

**Authentication layer.** `catalyst_auth: true` puts Catalyst's own login in front of your service. Leave it off for public APIs or custom auth.

**In this repo:** [`backend/Dockerfile`](backend/Dockerfile) is a two-stage build (install dependencies, then copy only what's needed, run as the unprivileged `node` user).

### Slate

Frontend hosting with a build step. It supports React (Vite), Next.js, Vue, Angular, Svelte, Astro, SolidJS, Preact and plain static sites.

**Key behaviors**

- **Environment variables are build-time only.** A Slate site is a static build, so `VITE_API_BASE` is baked into the JavaScript. To change it you rebuild and redeploy. This is why Development and Production need different builds. ([`frontend/src/api.js`](frontend/src/api.js))
- **Single-page apps need a fallback** so deep links don't 404. [`frontend/public/_redirects`](frontend/public/_redirects) contains `/* /index.html 200`.
- Don't set a non-root `baseUrl` or `basePath`, because Slate serves from `/`.
- Link and deploy: `catalyst slate:link --source <abs path> ...`, then `catalyst deploy slate <name> -ni`. Add `--production` to target Production.
- Run locally with `catalyst serve`, not `npm run dev`. Only `catalyst serve` supplies the Catalyst wrapper that auth and managed-service calls depend on.

**Slate calling AppSail.** They live on different domains, so the browser enforces CORS. The docs warn this can be blocked by Catalyst's auth layer. In this repo it works with `catalyst_auth` off and the API returning `access-control-allow-origin: *`, but test it on your own setup, and restrict `CORS_ORIGIN` for anything that isn't public data.

### Job Scheduling

Runs Job functions in the background or on a timer.

- A **job pool** is the compute that runs jobs.
- A **job** is one submitted run, immediate or scheduled.
- A **cron** is a schedule that submits jobs repeatedly.
- Both immediate and scheduled jobs have the same 15-minute limit.

You create the pool and schedule in the console (or through the MCP).

### Pipelines

CI/CD defined in a YAML file named `catalyst-pipelines.yml` (the console creates and reads that extension). The pieces:

| Key | Meaning |
| --- | --- |
| `runners` | VM size: config 1 (low), 2 (medium, the default), 3 (high) |
| `images` | The container a job runs in. Default is Ubuntu with the Catalyst CLI preinstalled. Every entry you add needs registry credentials (`auth`), even for public images, so this repo leaves it out |
| `jobs` | A named list of `steps`, which are shell commands |
| `stages` | Ordered phases containing jobs. At most 5 stages, at most 5 jobs per stage, and at most 2 in parallel on this account |
| `pipeline-when`, `when` | Conditions, for example run only on `refs/heads/main` |
| `approve` job | Pauses the run until a reviewer approves by email |
| `<< env.NAME >>` | A pipeline variable set in the console, which is where secrets belong |

Nested lists in `jobs` run **in parallel**. Shell state such as `cd` persists between steps of a job.

**In this repo:** [`catalyst-pipelines.yml`](catalyst-pipelines.yml) runs the tests (two in parallel, then one), deploys the fetcher and API in parallel and then the frontend to Development, and smoke-tests. Promotion to Production is not wired up.

### The rest of the platform

- **Authentication:** hosted or embedded sign-in, plus user management. Slate apps using embedded auth may be redirected to a legacy `/app/` path, so add a redirect back to `/`.
- **Cache:** in-memory key-value storage with a TTL, grouped into segments. Good for sessions and temporary data, not durable data.
- **Stratus:** object storage with buckets, multipart upload and signed URLs. It uses its own SDK-based API rather than the S3 API, and there is a migration tool for moving from S3 or GCS.
- **NoSQL:** a key-value table store with typed items and a required partition key. Use Data Store instead when you need joins, ZCQL or a fixed relational schema.
- **Signals:** an event bus that connects decoupled apps. Publishers (Zoho, Catalyst or custom) send events to targets such as functions, circuits and webhooks, with filtering, transformation and retry policies.
- **Zia and QuickML:** OCR, face analytics, text analytics, object detection, barcode scanning and content moderation, plus AutoML. Some features are limited by data center: AutoML/QuickML is not available in the EU, AU, IN, JP, SA, CA or UAE data centers, so check yours first.
- **SmartBrowz:** remote headless Chrome you can drive with Puppeteer, Playwright or Selenium, PDF and screenshot generation from HTML, a URL or a template, and Browser Logic functions.
- **Circuits:** multi-step workflows, including saga patterns for the missing database transactions. Available in the US data center only.

---

## Part 4: Tools for working with Catalyst

### SDKs

Catalyst ships SDKs for Node.js, Python, Java, the browser, Android, iOS and Flutter. **There is no Go SDK**, which is why this repo's backend is Node and not the Go app we first looked at.

The Node SDK is modular. This repo uses `@zcatalyst/auth` and `@zcatalyst/datastore`:

```js
const { zcAuth } = require('@zcatalyst/auth');
const { Datastore } = require('@zcatalyst/datastore');

const app = await zcAuth.init({ headers: req.headers }, { scope: 'admin' }); // AppSail
const datastore = new Datastore(app);
const rows = await datastore.executeZCQLQuery('SELECT login, score FROM Learners');
// rows look like [{ Learners: { login: '...', score: '...' } }], so unwrap by table name
```

Scope is either `user` (the caller's permissions) or `admin` (full access, for server-side work).

### The CLI in non-interactive mode

Agents and CI can't answer prompts, so use `-ni` and pass everything as flags. Two limits to know:

- `catalyst login` needs a human, because it runs a browser sign-in.
- Creating a project needs the console. The CLI can only link an existing one with `catalyst init --org <org> -p <project> -ni`.

### MCP server and agent skills

Catalyst 3.0 adds an **MCP server** and **Agent Skills** so AI coding agents can manage resources (tables, columns, job pools) and follow platform conventions. The MCP endpoint is per data center, and logging in uses a browser OAuth step. If login fails with "Invalid request url", check that the plugin points at your DC's endpoint.

---

## Part 5: Gotchas hit while building this app

These are real, in the order we met them.

| # | What happened | What it taught |
| --- | --- | --- |
| 1 | We assumed the US data center. Deploy URLs ended in `.in`. | The DC changes URLs and the MCP endpoint. Verify it early. |
| 2 | A Go backend couldn't use Data Store. | There is no Go SDK. Check SDK support before picking a language. |
| 3 | Queries failed with "Unknown Table or Column". The table existed but had only system columns. | Columns are created in the console and are easy to miss. We added [`schema.json`](backend/schema.json) and a `/api/health/schema` check so it fails loudly. |
| 4 | A new deploy answered `AppSail is disabled`, then `Execution failed`. | A fresh container takes about a minute to start. Poll health instead of guessing. |
| 5 | A deploy crashed at startup. The Dockerfile hadn't copied a new JSON file. | Run the image locally before deploying. A smoke test catches this. |
| 6 | `catalyst functions:execute` wanted Node 20, but the laptop had Node 25. | The CLI needs a runtime matching the function's stack. |
| 7 | `catalyst.json` recorded an absolute path from one laptop. | Machine-specific paths break forks and CI, so [`scripts/relink-slate.js`](scripts/relink-slate.js) fixes it. |
| 8 | A function's logs couldn't be read from the CLI. | Debug by adding a temporary diagnostic route, and remove it afterwards. |

---

## Part 6: Exercises

1. **Run it locally.** Follow the README quick start, then change the scoring weights in [`functions/fetcher/lib/score.js`](functions/fetcher/lib/score.js) and watch the tests fail until you update them.
2. **Add a column.** Add `longest_gap` to `schema.json`, create it in the console, and watch `/api/health/schema` go from `503` to `200`.
3. **Add an endpoint.** Add `GET /api/learners/:login/streaks` to the API, with a test, and rebuild the image.
4. **Schedule the sync.** Create a job pool and a daily cron for the `fetcher` in the console.
5. **Break production safely.** Introduce a bug on a branch and see which pipeline stage stops it. Then introduce one the tests miss and see what the smoke test catches.
6. **Add authentication.** Let learners sign in and claim their profile with Catalyst Authentication.

### Check yourself

- Why can't a Slate app read an environment variable at runtime?
- Why does an AppSail image built on an M-series Mac fail, and how do you fix it?
- When would you choose a Job function over an Advanced I/O function?
- What does admin scope allow that user scope doesn't?
- Why does this repo's pipeline deploy to Development and then pause?

---

## Glossary

| Term | Meaning |
| --- | --- |
| **AppSail** | Persistent backend service, managed runtime or Docker |
| **ZCQL** | Catalyst's SQL-like query language for Data Store |
| **ZAID** | A project's unique ID, used in URLs and different per environment |
| **Job pool** | The compute that runs Job functions |
| **Slate** | Frontend hosting with a build step |
| **Admin scope** | Server-side SDK access that bypasses per-user permissions |
| **DC** | Data center, the region your account lives in |
| **MCP** | Model Context Protocol, how AI agents call Catalyst tools |
| **`-ni`** | CLI flag for non-interactive mode |

## Where to go next

- [Catalyst documentation](https://docs.catalyst.zoho.com)
- [Students: free access](https://catalyst.zoho.com/students)
- This repo's [README](README.md) for the deploy steps
