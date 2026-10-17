# Deployment

Dalali Trust is a standard Node.js server (`next start`). It needs:

1. A **PostgreSQL 16** database.
2. A **private S3-compatible bucket** for photos and documents (local disk is fine only on a single server with persistent storage).
3. Optionally, an **email provider** (Resend) for password resets.
4. Two **daily scheduled jobs**: `npm run jobs:expire-verifications` and `npm run jobs:admin-digest`; plus `npm run jobs:send-whatsapp` every 15 minutes if WhatsApp updates are enabled.
5. Optional: **WhatsApp updates** through Meta's WhatsApp Business Platform — see [WHATSAPP.md](WHATSAPP.md).

## Recommended: Render (step by step in [LAUNCH.md](LAUNCH.md))

`render.yaml` at the repository root describes the whole setup as a Render Blueprint: the
website (`npm ci && npm run build`, migrations as a pre-deploy step, `npm start`, health check
`/api/health`), a PostgreSQL 16 database in Frankfurt, and the three scheduled jobs. Shared
settings live in the `dalali-shared` environment group; Render prompts for every secret.

## Hosting options

| Option                                                                     | Notes                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container / VM (Railway, Render, Fly.io, DigitalOcean App Platform, a VPS) | Recommended. Run `npm ci && npx prisma migrate deploy && npm run build && npm start`. Any of these work with `STORAGE_DRIVER=s3`                                                                                                                                           |
| Vercel                                                                     | Works with `STORAGE_DRIVER=s3` (the filesystem is not persistent) and a pooled PostgreSQL connection string. Run `prisma migrate deploy` in the build or release step. Server Actions accept uploads up to the configured 25 MB, but check your plan's request size limits |

Managed PostgreSQL: Neon, Supabase, AWS RDS, DigitalOcean, Render, Railway… Use `sslmode=require` in `DATABASE_URL`. For serverless hosting, use the provider's pooled endpoint (PgBouncer). Choose a region close to Tanzania (e.g. `af-south-1`, or an EU region) in line with your legal advice on data location.

## Object storage

1. Create a bucket (AWS S3, Cloudflare R2, Backblaze B2, or self-hosted MinIO).
2. **Block all public access.** The app streams files through authorised routes and never uses public URLs.
3. Create an access key limited to `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject` on that bucket.
4. Set `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, plus `S3_ENDPOINT` for non-AWS providers (and `S3_FORCE_PATH_STYLE=true` for MinIO).
5. Use encryption at rest (Cloudflare R2 and AWS S3 encrypt stored objects by default) and, if available, access logging and versioning with a lifecycle rule that expires deleted versions after a short period, so purged evidence does not linger.

## Environment

Set every variable listed in `.env.example`. In production:

- `NODE_ENV=production` (set automatically by `next start`)
- `BETTER_AUTH_SECRET`: a new 32+ byte random value, stored in your platform's secret manager
- `BETTER_AUTH_URL` and `APP_URL`: your public `https://` origin
- `TRUST_PROXY_HEADERS=true` only if a trusted proxy sets `X-Forwarded-For`
- `EMAIL_PROVIDER=resend` (or `none`). `console` is refused at startup

## Release procedure

```bash
npm ci
npx prisma migrate deploy      # apply migrations (safe to re-run)
npm run build
npm start                      # or your platform's start command
```

Health check: `GET /api/health` returns 200 `{"status":"ok"}` when the database is reachable, otherwise 503.

Create the first administrator after the first deploy: sign up normally, then run `npm run admin:promote -- you@example.com` from a shell with `DATABASE_URL`.

Schedule daily: `npm run jobs:expire-verifications` (cron, platform cron job, or a GitHub Action with the production `DATABASE_URL` secret and storage credentials).

Schedule each morning (for example 06:00 EAT, which is 03:00 UTC): `npm run jobs:admin-digest`. It emails every active administrator a short summary of listings, verification requests and reports waiting for review, flagging urgent reports. It sends nothing when the queue is empty and needs `EMAIL_PROVIDER=resend`.

## Backups and recovery

- Enable **automated daily backups with point-in-time recovery (PITR)** in your managed PostgreSQL provider. Keep at least 7–30 days.
- For an extra logical backup, run something like the following and store the output encrypted, off-site, with restricted access:
  ```bash
  pg_dump --format=custom --no-owner "$DATABASE_URL" > dalali-$(date +%F).dump
  ```
- Restore into a **new** database, then switch `DATABASE_URL`:
  ```bash
  createdb dalali_restore
  pg_restore --no-owner --dbname "postgresql://…/dalali_restore" dalali-YYYY-MM-DD.dump
  npx prisma migrate status   # confirm the migration history matches the code
  ```
- Bucket: enable versioning and replication if your provider supports it. Database rows reference objects by key. If a restore brings back rows whose files were purged, the app returns 404 for those files.
- **Test a restore every quarter.** An untested backup is not a backup.
- Backups contain personal data. Apply the same access controls and plan their retention in line with the privacy policy.

## Deployment checklist

- [ ] Legal review of Privacy Policy and Terms completed. PDPA 2022 obligations confirmed (registration, data location, cross-border transfer)
- [ ] `BETTER_AUTH_SECRET` generated fresh for production and stored in a secret manager
- [ ] `BETTER_AUTH_URL` / `APP_URL` set to the HTTPS origin, and HTTPS enforced at the edge
- [ ] Managed PostgreSQL with SSL, automated backups and PITR enabled. Restore tested
- [ ] `npx prisma migrate deploy` run successfully
- [ ] `STORAGE_DRIVER=s3` with a **private** bucket, least-privilege key and encryption at rest
- [ ] Email provider configured (or `EMAIL_PROVIDER=none` accepted, with support handling resets manually)
- [ ] Support contact variables set (`SUPPORT_EMAIL`, `SUPPORT_PHONE`, `SUPPORT_WHATSAPP`)
- [ ] First administrator created with `admin:promote`. Admin accounts limited to trained reviewers
- [ ] Daily `jobs:expire-verifications` and morning `jobs:admin-digest` scheduled and their output monitored
- [ ] Uptime monitor on `/api/health`. Error logging and alerts configured on the platform
- [ ] `TRUST_PROXY_HEADERS` set correctly for your proxy setup
- [ ] Seed script **not** run against production (it refuses by default)
- [ ] Swahili copy reviewed by a native speaker
- [ ] Operations playbook (OPERATIONS.md) read by every moderator
