# Dalali Trust

> Making property search in Tanzania more transparent, accountable, and trustworthy.

Dalali Trust is a mobile-first rental platform for Tanzania. Tenants search rooms, apartments and houses with **the full cost shown up front**. A person **reviews every listing before it goes live**. Advertisers can complete **manual verification checks with a clearly stated scope**. A structured **reporting and moderation** process handles problems.

This directory contains the Next.js application. The original SahaShares prototype (Express + MongoDB + Vite) is kept, unchanged, in [`legacy-sahashares/`](legacy-sahashares/). See [docs/MIGRATION.md](docs/MIGRATION.md) for what happened to each legacy feature.

| Area       | Choice                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React 19, Server Actions), TypeScript (strict)                    |
| Database   | PostgreSQL 16, Prisma ORM 7 with versioned migrations                                     |
| Auth       | Better Auth 1.7: email + password (scrypt), database sessions, HttpOnly cookies           |
| Validation | Zod 4 on the server for every input                                                       |
| Styling    | Tailwind CSS 4, with the navy/green/gold palette from the original client                 |
| Files      | Private object storage: local disk in development, any S3-compatible bucket in production |
| Tests      | Vitest integration tests against real PostgreSQL, plus Playwright end-to-end tests        |
| i18n       | English and Swahili (cookie-based, no extra dependency)                                   |

More detail: [Architecture](docs/ARCHITECTURE.md) · [Security & privacy](docs/SECURITY.md) · [Deployment](docs/DEPLOYMENT.md) · [Operations, verification & launch](docs/OPERATIONS.md) · [Repository audit](docs/AUDIT.md) · [Legacy migration](docs/MIGRATION.md)

---

## Features (MVP)

- **Public site:** home page, search with filters (region, district, type, budget, bedrooms, availability, identity-verified advertisers) and sorting. Property pages include a photo gallery, a cost breakdown with an estimated move-in total, utilities, amenities, an approximate map and a verification panel. Also: advertiser profiles, How it works, Verification explained, Safety, About, Contact, Privacy and Terms. Loading, empty, error and 404 states are included.
- **Accounts and roles:** tenant, landlord, agent and administrator. Users choose tenant, landlord or agent at sign-up. Administrator can only be granted by the CLI or by another administrator. The app supports sign-out, password reset by email (when email is configured), password change and self-service account deletion.
- **Listings:** draft → pending review → published / rejected; plus archived and suspended. At least one photo is required before review. Editing a published listing sends it back to review. Advertisers confirm availability without a new review, and stale listings show a warning. The admin review screen flags possible duplicates (identical photos, or very similar listings).
- **Verification:** three separate checks (identity, landlord/agent authorisation, property evidence). Statuses are not submitted, pending review, more information required, verified, rejected and expired. Each decision records the reviewer, time, reason, an exact scope statement and an expiry date. Documents live in private storage and only the submitter and administrators can open them. Every administrator access is logged, and documents are purged after a retention period.
- **Reports and moderation:** six report categories, attachments, and statuses (submitted, under review, info requested, action taken, dismissed, appealed). Moderators can suspend a listing or account, and either party can appeal once. The reporter's identity is never shown to the reported party. Moderators see the reporter's history to help spot retaliatory reports. Nothing is suspended automatically.
- **Viewing requests:** a tenant proposes a time. The advertiser accepts, declines or marks it completed. The tenant can cancel. In-app notifications go to both sides.
- **Dashboards:**
  - Tenants: saved homes, viewing requests, reports, notifications, settings.
  - Advertisers: listings with 30-day stats (views, contact clicks, saves, viewing requests), photos, availability, verification, public profile.
  - Admins: metrics, moderation queues, verification queue, reports, users (role changes, suspension), audit log, feedback.
- **Startup readiness:** privacy-respecting product events (no user IDs or IPs), a feedback form, an advertiser onboarding page, an operations playbook, and disclaimers about what was and was not verified.

Out of scope by design: online payments, deposits, escrow, holding customer funds, automated ownership claims, and any "AI verification". See [docs/MIGRATION.md](docs/MIGRATION.md).

---

## Prerequisites

- Node.js **20.19+** (22 LTS recommended) and npm 10+
- PostgreSQL **16** (via Docker Compose, a local install, or a managed provider)
- For end-to-end tests: Playwright's Chromium (`npx playwright install chromium`)

## Local development (fresh clone)

```bash
cd dalali-trust-mvp-main

# 1. Install dependencies (also generates the Prisma client)
npm install

# 2. Start PostgreSQL (creates dalali_trust and dalali_trust_test)
docker compose up -d postgres
#    …or use a local PostgreSQL 16: see "PostgreSQL setup" below.

# 3. Configure environment
cp .env.example .env
#    then set BETTER_AUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# 4. Apply migrations
npx prisma migrate deploy        # or `npm run db:migrate` while developing the schema

# 5. (Optional) load clearly-fictional sample data
npm run db:seed

# 6. Run
npm run dev                      # http://localhost:3000
```

The seed prints four sample accounts (admin, landlord, agent, tenant), all with the password `dalali-dev-password`. Every sample record is labelled `[SAMPLE]`, uses generated placeholder photos, and no sample advertiser is verified. The seed refuses to run when `NODE_ENV=production` or against a non-local database host.

### Creating the first administrator

Nobody can sign up as an administrator. Create a normal account in the UI, then run this with database access:

```bash
npm run admin:promote -- you@example.com
```

## PostgreSQL setup

- **Docker:** `docker compose up -d postgres` starts PostgreSQL 16 with user `dalali` / password `dalali_dev_password`, a `dalali_trust` database and a `dalali_trust_test` database (created by `scripts/docker-init-test-db.sql`). Data persists in the `pgdata` volume.
- **Local install:** create the role and databases yourself:
  ```sql
  CREATE ROLE dalali LOGIN PASSWORD 'dalali_dev_password' CREATEDB;
  CREATE DATABASE dalali_trust OWNER dalali;
  CREATE DATABASE dalali_trust_test OWNER dalali;
  CREATE DATABASE dalali_trust_e2e OWNER dalali;   -- only for Playwright
  ```
- **Managed PostgreSQL** (Neon, Supabase, AWS RDS, DigitalOcean, Render…): put the connection string in `DATABASE_URL` with `sslmode=require`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Prisma migrations

| Command                                           | Use                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run db:migrate`                              | Development: create and apply a migration after editing `prisma/schema.prisma` |
| `npx prisma migrate deploy` (`npm run db:deploy`) | CI / production: apply committed migrations, never generates new ones          |
| `npm run db:generate`                             | Regenerate the Prisma client (also runs on `npm install`)                      |
| `npm run db:seed`                                 | Development-only fictional data                                                |

Migrations live in `prisma/migrations/`. The initial migration also adds PostgreSQL `CHECK` constraints that Prisma cannot express, such as non-negative money, currency = TZS, and a verified status requiring a scope statement. CI checks that migrations and schema stay in sync.

## Environment variables

[`.env.example`](.env.example) documents every variable. The server validates the configuration at startup (`src/server/env.ts`) and refuses to start if it is invalid. For example, `EMAIL_PROVIDER=console` is rejected in production.

## Testing

```bash
npm run format:check && npm run lint && npm run typecheck
npm test            # Vitest: 84 integration + unit tests against TEST_DATABASE_URL
npm run build && npm run test:e2e   # Playwright: user journeys against E2E_DATABASE_URL
```

- Integration tests run every service against a real PostgreSQL database. `TEST_DATABASE_URL` must point to its own database, because tables are truncated between tests. They cover authentication, role restrictions and privilege escalation, mass assignment, listing lifecycle, search and filters, verification transitions, private document access, reports and appeals, viewing requests, rate limiting, account deletion and validation.
- End-to-end tests start the production build on port 3100 with a freshly reset and seeded `E2E_DATABASE_URL` database. They cover: a tenant signing up, searching, saving, requesting a viewing and reporting; a landlord listing a property, an admin approving it, and the listing appearing in search; admin verification review; access control; security headers; and the language switch. Run them on a mobile (Pixel 7) and a desktop profile.

## Production build

```bash
npm ci
npx prisma migrate deploy
npm run build
npm start                 # PORT defaults to 3000
```

Schedule `npm run jobs:expire-verifications` daily. It expires old verifications and purges evidence past the retention period. Health check: `GET /api/health`. The full checklist is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Project layout

```
prisma/                 schema.prisma, migrations/, seed.ts (dev only)
src/app/                routes (public pages, (auth), dashboard/, admin/, api/), server actions in app/actions
src/server/             env, db, auth, session, errors, rate limiting, audit, storage, uploads
src/server/services/    domain logic + authorization (listings, verification, reports, viewings, users, trust)
src/components/         UI components
src/i18n/               English/Swahili dictionaries and long-form page content
tests/                  Vitest integration/unit tests
e2e/                    Playwright tests
scripts/                admin promotion, daily jobs, legacy export
legacy-sahashares/      original prototype, preserved for reference (not deployed)
docs/                   architecture, security, deployment, operations, audit, migration
```

## Important limitations

- Verification is a **manual review of documents** supplied by advertisers. Dalali Trust has no integration with NIDA, the Ministry of Lands or any other registry, and no badge proves legal ownership. See [docs/OPERATIONS.md](docs/OPERATIONS.md).
- Legal pages are **drafts**. Have them reviewed by a Tanzanian lawyer, and complete any registration required under the Personal Data Protection Act, 2022, before launching publicly or collecting identity documents.
- Swahili copy is a first draft and needs review by a native speaker. Administrator screens are English-only.
- The problems listed on the home page are product hypotheses to validate with real users. The site makes no statistical claims.
