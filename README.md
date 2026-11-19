<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./frontend/public/assets/openats-readme-white.png">
    <img src="./frontend/public/assets/openats-readme-black.png" alt="OpenATS logo" width="240">
  </picture>
</h1>

<p align="center">
  <strong>An open-source multi-client applicant tracking and candidate sourcing platform for agencies and modern hiring teams.</strong>
</p>

<p align="center">
  <a href="https://demo.openats.dev"><strong>Live demo</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#tech-stack"><strong>Tech stack</strong></a> ·
  <a href="#getting-started"><strong>Getting started</strong></a> ·
  <a href="#configuration"><strong>Configuration</strong></a> ·
  <a href="./CONTRIBUTING.md"><strong>Contributing</strong></a>
</p>

<p align="center">
  <img alt="Apache 2.0 licence" src="https://img.shields.io/badge/licence-Apache%202.0-blue.svg">
  <img alt="Next.js" src="https://img.shields.io/badge/frontend-Next.js-black.svg">
  <img alt="Express" src="https://img.shields.io/badge/backend-Express%205-black.svg">
  <img alt="Postgres" src="https://img.shields.io/badge/database-Postgres-336791.svg">
</p>

---

OpenATS is an open-source applicant tracking and sourcing system built for recruitment agencies
and organizations that manage hiring across multiple clients and teams in one clear, shared workspace.
It replaces disconnected spreadsheets, inboxes, and point tools with a unified platform that follows
candidates from sourcing and talent pooling through client job pipelines, interviews, and offers.

## Features

- **Multi-client recruiting**: manage client companies with dedicated profiles, logos, time zones,
  and client-scoped departments. Filter jobs, candidates, and pipelines by client across your workspace.
- **Client-branded careers pages**: provide dedicated public careers boards for each client at
  `/careers/clients/:slug`, displaying client branding, logos, and active openings.
- **Global talent pool**: source candidates independently of specific jobs into a central talent
  database, and submit them directly across multiple active client openings with submission tracking.
- **Bulk resume ingestion & parsing**: upload single CVs or batch import resumes in bulk using
  PDF, Word (`.docx`, `.doc`), or compressed archives (`.zip`) with automated candidate detail extraction.
- **Jobs and applications**: create jobs assigned to clients with optional departments, salary details,
  and custom screening questions (with knockout rules).
- **Candidate pipeline**: move candidates through customizable hiring stages on a shared drag-and-drop
  board, with filters, bulk actions, and complete audit history.
- **CV full-text search**: the text of every uploaded CV is parsed on your server, enabling instant
  keyword searching across all resumes with match highlighting.
- **Candidate scoring**: configure weights for application answers, skill assessments, interviewer
  ratings, and scorecards to generate an objective candidate score.
- **Assessments**: create timed tests with multiple-choice and written questions, automate invitations
  at specific pipeline stages, and grade responses.
- **Interviews & scheduling**: let candidates select available interview slots, sync bookings directly
  to interviewer Google Calendars with Google Meet links, and collect structured scorecards.
- **Offers**: draft offer letters from templates, track views, and receive online candidate
  acceptance or decline before deadlines.
- **Automated emails**: trigger customizable emails to candidates and interviewers at every hiring step.
- **Team collaboration**: internal notes, candidate ratings, and per-job hiring team discussions.
- **Modern responsive layout**: collapsible sidebar with icon and off-canvas modes for desktop and mobile.
- **Role-based access**: super admins, hiring managers, and interviewers with granular per-job visibility.
- **Optional AI notes**: enable Gemini AI for automated CV summaries, strengths, and gap analysis
  (off by default and never impacts candidate scores).

## Tech stack

One pnpm workspace with two packages, `frontend` and `backend`, installed from the root.

| | |
| --- | --- |
| **Frontend** | [Next.js](https://nextjs.org) (App Router) · TypeScript · [Tailwind CSS v4](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com) · [hugeicons](https://hugeicons.com) · [React Query](https://tanstack.com/query) |
| **Backend** | [Express 5](https://expressjs.com) · TypeScript · [Socket.IO](https://socket.io) for live updates |
| **Database** | PostgreSQL with [Drizzle ORM](https://orm.drizzle.team) |
| **Background jobs** | [BullMQ](https://docs.bullmq.io) on Redis, run by a required worker process (CV text, file cleanup, optional AI notes) |
| **Sign-in** | Built in with [Better Auth](https://www.better-auth.com): email and password, no outside identity service |
| **Storage** | Cloudflare R2 or any S3-compatible bucket |
| **Email** | Any SMTP server ([Mailpit](https://mailpit.axllent.org) locally) |
| **AI (optional)** | [Gemini](https://ai.google.dev) |

### Repository layout

| Path | |
| --- | --- |
| `frontend/` | Next.js app, port 3000. See its [README](./frontend/README.md) |
| `backend/` | Express API and background worker, port 8080 |
| `backend/drizzle/` | Generated database migrations, always committed |
| `e2e/` | Playwright end-to-end tests |
| `docs/` | The documentation site |

## Getting started

### Quick Start with Docker (Recommended)

Run OpenATS with a single command on any machine with Docker:

1. Download [`docker-compose.yml`](./docker-compose.yml) into an empty directory.
2. Run:
   ```sh
   docker compose up -d
   ```
3. Open http://localhost:3000 to sign in. The initial admin password is displayed in the terminal output or viewable anytime with:
   ```sh
   docker compose logs admin
   ```
Emails are captured locally at http://localhost:8025.

### Development from Source

To run directly from source, you need Node.js 24+, Docker, pnpm (`npm install -g pnpm`), `make` and `openssl`.

```sh
git clone https://github.com/NoahTek/OpenATS.git && cd OpenATS

make setup   # installs, creates both .env files, starts Postgres and Redis,
             # runs migrations, seeds the pipeline stages, creates your first admin
make dev     # API on :8080, worker, and the app on :3000
```

Open http://localhost:3000 and sign in with the admin you created. Run `make admin` at any time
to add a super admin, or to get back in if you are locked out.

A few values can't be generated for you: fill in `R2_*` in `backend/.env` before uploading CVs.
Email works locally out of the box: everything the app sends lands in Mailpit at http://localhost:8025.

The **background worker is required**. It reads every uploaded CV and removes the files of
deleted candidates; without it, CVs stay "pending". `make dev` starts it with everything else.
To turn on AI notes, set `GEMINI_API_KEY` and enable it in **Settings → General**.

For every step done by hand, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Configuration

Each package reads its own `.env`, and each `.env.example` explains every value. Both apps stop at
startup with a clear message if a required value is missing.

**`backend/.env`**

| Variable | What it is for |
| --- | --- |
| `DATABASE_URL` | Postgres connection |
| `REDIS_URL` | Redis, for background jobs |
| `AUTH_JWKS_URL` / `AUTH_ISSUER` | Checking sign-in tokens. `AUTH_ISSUER` must equal `BETTER_AUTH_URL` |
| `ENCRYPTION_KEY` | Encrypts stored integration credentials |
| `FRONTEND_URL` | CORS and links in emails |
| `R2_*` | File storage |
| `SMTP_*` / `MAIL_FROM` | Email, through any SMTP server |
| `GEMINI_API_KEY` | Optional. AI notes, also off until turned on in Settings |
| `GOOGLE_OAUTH_*` | Optional. Lets interviewers connect Google Calendar and Meet |

**`frontend/.env`**

| Variable | What it is for |
| --- | --- |
| `DATABASE_URL` | The same database as the backend |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Sign-in: a secret of 32+ characters, and the app's public URL |
| `OPENATS_API_URL` / `NEXT_PUBLIC_API_URL` | Where the backend is, from the server and the browser |
| `SMTP_*` / `MAIL_FROM` | Optional. Invite and password reset emails (same values as the backend) |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full setup, branching rules and how to open a
pull request.

## Licence

[Apache 2.0](./LICENSE).
