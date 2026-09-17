# Michelle Ihirwe — booking website & practice management

A production Next.js application for **Michelle Ihirwe, Sexologist & Intimacy Therapist**: a public marketing/booking site built to the approved **Option 3: Private Sanctuary** design, plus a private admin area for managing appointments, availability, pricing, reviews and website content without touching code.

Read [`docs/HANDOFF.md`](docs/HANDOFF.md) for the pre-launch checklist, accessibility/privacy status, and the content decisions Michelle still needs to approve before this goes live for real clients.

## Tech stack

- **Next.js 16** (App Router, TypeScript) — server-rendered public pages, API routes, Server Actions for the admin area
- **Prisma** + **SQLite** locally, **PostgreSQL** in production (Render) — same schema, one line to switch
- **Custom session auth** for the single admin account (JWT in an httpOnly cookie via `jose`, passwords hashed with `bcryptjs`) — no third-party auth provider needed
- **Resend** for transactional email (booking confirmations, review invites) — optional locally; the app logs instead of sending until you add an API key
- **Luxon** for all date/time math, so `Europe/Brussels` daylight-saving transitions are handled correctly
- **Vitest** (unit/integration) + **Playwright** (end-to-end) for tests

## Getting started (local development)

```bash
npm install
cp .env.example .env        # then fill in SESSION_SECRET, SEED_ADMIN_* (see below)
npm run db:migrate           # creates prisma/dev.db and applies migrations
npm run db:seed              # confirmed services/fees, admin login, placeholder content
npm run dev                  # http://localhost:3000
```

Generate a real `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Sign in to the admin area at `/admin/login` with whatever `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you put in `.env` before running `npm run db:seed`. Change the password from `/admin/settings` after your first sign-in.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / run |
| `npm run db:migrate` | Apply Prisma migrations (creates `prisma/dev.db` locally) |
| `npm run db:seed` | Seed confirmed services, admin user, default availability, placeholder content |
| `npm run db:studio` | Prisma Studio — browse/edit the database directly |
| `npm test` | Unit + integration tests (Vitest, against a disposable `prisma/test.db`) |
| `npm run test:e2e` | End-to-end tests (Playwright) — needs the dev server; `npx playwright install` once first |
| `npm run lint` | ESLint |

## Environment variables

See [`.env.example`](.env.example) for the full list with explanations. Nothing in `.env` is ever committed.

| Variable | Local dev | Production |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db?pool_timeout=20` | A Postgres connection string from Render |
| `SESSION_SECRET` | any long random string | a **different** long random string, kept secret |
| `RESEND_API_KEY` | optional — leave blank to log emails instead of sending | required to actually send email |
| `EMAIL_FROM` | any value | a verified sender on your Resend domain |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | your real domain, e.g. `https://michelle-ihirwe.be` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | only read by `npm run db:seed` | same, for the first production admin account |

## Setting up Resend (email)

Booking confirmations, reschedule/cancel links, and review invites are sent by email. Until you configure this, the app **still works** — it just logs `[email:not-configured]` to the server console instead of sending, so local development never breaks on a missing key.

1. Create a free account at [resend.com](https://resend.com).
2. Verify a sending domain (or use their shared test domain while developing).
3. Create an API key and set `RESEND_API_KEY` in `.env` (locally) or your host's environment variables (production).
4. Set `EMAIL_FROM` to an address on your verified domain, e.g. `"Michelle Ihirwe <no-reply@yourdomain.com>"`.

## Deploying to Render

1. **Database**: create a Render PostgreSQL instance. Copy its connection string into `DATABASE_URL` for the web service (Render's internal connection string is fine — no need for the external one).
2. **Web service**: create a Render Web Service from this repo.
   - Build command: `npm install && npx prisma migrate deploy && npm run build`
   - Start command: `npm start`
3. Set all the environment variables from `.env.example` in Render's dashboard (`SESSION_SECRET` and `RESEND_API_KEY` especially — never commit these).
4. After the first deploy, run the seed **once** (Render's shell, or a one-off job): `npm run db:seed`. Do this before pointing real users at the site — it creates the admin login and confirmed pricing.
5. Point your domain at the Render service and update `NEXT_PUBLIC_SITE_URL`.

### Backup & restore (Postgres)

Render's Postgres dashboard provides point-in-time restore and manual backup downloads (`pg_dump`) out of the box — use those rather than a custom script. To restore into a fresh database: `psql $DATABASE_URL < backup.sql`, then `npx prisma migrate deploy` to make sure the schema matches the current migrations.

## Project structure

```
prisma/                   Schema, migrations, seed script
src/app/                  Next.js routes
  (public pages)          /, /about, /sessions, /book, /reviews, /contact, /privacy, /terms
  /manage/[token]          Client-facing reschedule/cancel (secure link, emailed after booking)
  /reviews/write/[token]   Client-facing review submission (secure link, emailed after a completed session)
  /admin/                  Admin area — login is public, everything else requires a session
  /api/                    Booking, availability, and account API routes
src/components/           React components (public site, booking wizard, admin widgets)
src/lib/                  Core logic: availability/scheduling, booking, reviews, email, auth, timezone
tests/unit/                Pure-logic tests (timezone/DST math)
tests/integration/         Tests against a real (disposable) database (double-booking, review tokens)
tests/e2e/                  Playwright browser tests (booking journey, admin auth & workflows)
reference/                 Original approved design files and supplied assets — not part of the running app
```

## Original design brief

The client-approved creative direction and functional requirements this was built from are preserved in [`docs/AGENT_BUILD_PROMPT.md`](docs/AGENT_BUILD_PROMPT.md), with the original visual reference in [`reference/approved-preview-standalone.html`](reference/approved-preview-standalone.html) and [`reference/approved-option-3-fragment.html`](reference/approved-option-3-fragment.html).
