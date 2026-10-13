# Architecture

## Overview

A single Next.js 16 application, deployed as one Node.js process, with PostgreSQL as the only stateful dependency besides object storage. Microservices, queues and separate search services were deliberately left out.

```
Browser ──HTTPS──> Next.js (App Router)
                    ├─ Server Components: read via services (src/server/services)
                    ├─ Server Actions (src/app/actions): parse FormData → call services
                    ├─ Route handlers: /api/auth (Better Auth), /api/media, /api/evidence, /api/report-evidence, /api/health
                    └─ Services: authorization + validation + Prisma transactions + audit log
                            ├─ PostgreSQL (Prisma 7 + @prisma/adapter-pg)
                            └─ Object storage (local disk | S3-compatible private bucket)
```

**Authorization lives in the service layer.** Every service function receives the `Actor`, a user loaded fresh from the database (`getActor()`), and checks role, status and ownership itself (`assertAdmin`, `assertAdvertiser`, ownership comparisons). Pages and actions are thin wrappers. Hiding a button or route is never relied on, and the integration tests call services directly to prove it.

## Version decisions

| Package                 | Version | Notes                                                                                                                                                |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| next                    | 16.4.0  | Latest stable. Turbopack build, async `params`/`searchParams`                                                                                        |
| react / react-dom       | 19.3.0  | Required by Next 16. `useActionState` for forms                                                                                                      |
| prisma / @prisma/client | 7.10.0  | Latest stable 7.x. Uses the `prisma-client` generator and driver adapter (`@prisma/adapter-pg`). The 8.x line was still a release candidate          |
| better-auth             | 1.7.7   | Maintained auth library with Prisma adapter, database sessions, scrypt hashing, built-in rate limiting and password reset. Auth.js v5 was still beta |
| zod                     | 4.3.3   |                                                                                                                                                      |
| tailwindcss             | 4.3.3   | Same major as the legacy client, so the tokens carried over directly                                                                                 |
| typescript              | 5.9.3   | TS 7 (native) was not used, to stay within what Next 16 tooling supports                                                                             |
| vitest                  | 5.0.4   | Earlier 4.x releases had a reported advisory; npm 10 could not resolve 4.1.x peers                                                                   |
| @playwright/test        | 1.56.1  | Matches the pre-installed Chromium build                                                                                                             |
| eslint                  | 9.x     | `eslint-config-next` 16 flat config                                                                                                                  |

`package.json` overrides pin `mysql2` and `deepmerge-ts` to patched versions. These are transitive optional dependencies of the Prisma CLI and Better Auth, and the app never uses MySQL. `npm audit --omit=dev` reports 0 vulnerabilities. Remaining `npm audit` findings are in dev-only lint tooling (`braces` via `eslint-config-next`) with no upstream fix yet.

## Data model

See `prisma/schema.prisma` for the source of truth, with comments.

- **Identity:** `User` (role: TENANT | LANDLORD | AGENT | ADMIN; status: ACTIVE | SUSPENDED | DELETED), `Session`, `Account` (password hash), `Verification` (Better Auth tokens), `RateLimit`.
- **Advertisers:** `AdvertiserProfile` (1:1 with User). It holds public display data and is separate from User so public pages select only safe columns. `plan` (FREE) is the hook for later subscriptions.
- **Listings:** `Property` (status lifecycle, availability, integer TZS money, approximate lat/lng as `Decimal(8,5)` rounded to ~100 m), `PropertyImage` (storage keys, SHA-256 for duplicate detection), `PropertyCharge` (other costs, one-time or monthly), `SavedProperty` (composite PK).
- **Verification:** `VerificationRequest` (type, status, reviewer, reason, scope statement, decided/expires dates; `propertyId` required only for PROPERTY_EVIDENCE, enforced by a CHECK constraint), `VerificationEvidence` (private storage key, MIME type, size, hash, `purgedAt`).
- **Engagement:** `ViewingRequest` (requester and advertiser denormalised for authorization and indexing).
- **Trust & safety:** `Report`, `ReportEvidence`, `ModerationAction` (every moderator decision with reason), `AuditLog` (append-only, sanitised metadata).
- **Other:** `Notification` (in-app only), `Feedback`, `AnalyticsEvent` (name and listing ID only).

Deletion behaviour: user-owned personal data cascades. `Property.advertiser` is `Restrict`, and accounts are anonymised instead of deleted so moderation history stays intact. Moderation and audit references use `SetNull`/`Restrict` so the history survives.

Money: integer whole shillings in `Int` columns, with `currency CHAR(3) = 'TZS'` enforced by a CHECK constraint. `moveInCost()` uses integer arithmetic only.

Timestamps: `timestamptz(3)`, stored in UTC and displayed with `Intl.DateTimeFormat` in `Africa/Dar_es_Salaam`. Viewing times entered in `datetime-local` inputs are interpreted as EAT (UTC+3, no DST).

### Indexes

Public search always filters on `status = 'PUBLISHED'`, so composite indexes lead with `status`: `(status, region, district)`, `(status, propertyType)`, `(status, rentAmount)`, `(status, bedrooms)`, `(status, publishedAt DESC)`. Queue indexes: `verification_request(status, submittedAt)` and `report(status, createdAt)`. Owner indexes: `property(advertiserId, status)` and `viewing_request(advertiserId, status)`.

### Search trade-off

Keyword search uses parameterised, case-insensitive `ILIKE` on title, neighbourhood, district and description, applied after the indexed structured filters. That is simple, correct for Swahili and English place names, and fast at MVP scale (thousands of listings). The upgrade path, when needed:

1. Add a generated `tsvector` column (`'simple'` configuration, since PostgreSQL has no Swahili stemmer) with a GIN index in a SQL migration, and/or `pg_trgm` for typo-tolerant neighbourhood matching.
2. Only consider an external search service if PostgreSQL cannot keep up.

## Key flows

- **Listing lifecycle:** `DRAFT → PENDING_REVIEW → PUBLISHED | REJECTED`, `PUBLISHED → SUSPENDED → PUBLISHED`, any → `ARCHIVED → DRAFT`. Transitions use conditional `updateMany({ where: { id, status } })` inside transactions, so concurrent changes fail safely instead of overwriting each other.
- **Public visibility:** `status = PUBLISHED AND advertiser.status = ACTIVE`. Suspending an advertiser hides all their listings immediately.
- **Trust summary:** computed from verification rows. A `VERIFIED` row only counts until `expiresAt`, so expiry is enforced on read even if the daily job has not run.
- **Files:** uploads are type-checked by magic bytes and size-limited. Images are re-encoded with sharp (stripping EXIF/GPS) into a 1600 px WebP plus a 640 px thumbnail. Files are stored under random keys and streamed through authorising route handlers.

## Internationalisation

`src/i18n/en.ts` defines the dictionary. `sw.ts` must satisfy the same TypeScript type, so missing translations fail the build. The locale comes from the `dalali_locale` cookie, then the `Accept-Language` header, and is also saved on the user. Long-form pages are in `src/i18n/content.ts`.

## Analytics events

Stored in `analytics_event` with no user ID, IP or user agent: `listing_view`, `contact_reveal`, `whatsapp_click`, `listing_saved`, `viewing_requested`, `report_submitted`, `signup_completed`, `listing_submitted`. These feed advertiser stats and admin metrics. To use an external tool (e.g. Plausible), forward the same event names without adding personal data.
