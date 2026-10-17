# Launch checklist (Render)

A plain step-by-step guide to putting Dalali Trust online. Allow about half a day, plus a
few days of waiting for Meta if you also switch on WhatsApp updates. Prices and screen
names at Render, Cloudflare and Resend change: check them as you go.

## Before you start

- A domain name, e.g. `dalalitrust.co.tz` (`.co.tz` domains are sold by Tanzanian registrars).
- A card or mobile-money–linked card for Render (website + database) and possibly Cloudflare.
- The GitHub repository `Shemsanofly/dalali-trust`.

## 1. Storage for photos and documents (Cloudflare R2)

1. Create a Cloudflare account → **R2** → **Create bucket**, name it e.g. `dalali-private`.
   Leave public access **off**: the website shows files only to people allowed to see them.
2. **Manage R2 API tokens** → create a token with _Object Read & Write_ on that bucket only.
3. Write down: the **Access Key ID**, **Secret Access Key**, and the **S3 endpoint**
   (`https://<account-id>.r2.cloudflarestorage.com`).

## 2. Email (Resend)

1. Create a Resend account and **add your domain**; add the DNS records it shows at your
   domain registrar and wait until the domain shows _Verified_.
2. Create an **API key**. Your sender will be e.g. `Dalali Trust <no-reply@dalalitrust.co.tz>`.

## 3. Website, database and scheduled jobs (Render)

1. Create a Render account and connect GitHub.
2. **New + → Blueprint**, choose the `dalali-trust` repository. Render reads `render.yaml`
   and shows: the website, the PostgreSQL database (Frankfurt, closest to Tanzania) and three
   scheduled jobs (morning summary, nightly verification expiry, WhatsApp retries).
3. Fill in the values it asks for:

   | Setting                              | What to enter                               |
   | ------------------------------------ | ------------------------------------------- |
   | `APP_URL` and `BETTER_AUTH_URL`      | `https://dalalitrust.co.tz` (your domain)   |
   | `S3_BUCKET`                          | `dalali-private`                            |
   | `S3_ENDPOINT`                        | the R2 endpoint from step 1                 |
   | `S3_ACCESS_KEY_ID` / `S3_SECRET_...` | the R2 keys from step 1                     |
   | `RESEND_API_KEY`                     | the Resend key from step 2                  |
   | `EMAIL_FROM`                         | `Dalali Trust <no-reply@dalalitrust.co.tz>` |
   | `SUPPORT_EMAIL`                      | the address people can write to             |

4. **Apply**. The first build takes a few minutes. When the website shows _Live_, open its
   `….onrender.com` address and check that the home page loads.
5. **Your domain:** website → Settings → **Custom Domains** → add your domain and add the DNS
   record Render shows at your registrar. Render adds HTTPS automatically.

## 4. First administrator

1. On the live site, **create an account** for yourself (choose any role).
2. In Render: website → **Shell**, run `npm run admin:promote -- you@example.com`.
3. Sign out and in again: you now see **Admin** in the menu.

## 5. Check everything once

- [ ] Sign up as a landlord on your phone, add a listing with a photo, send it for review.
- [ ] As admin, approve it; it appears in search. Share the link on WhatsApp: the preview shows the photo and price.
- [ ] From another account, request a viewing; the landlord sees it and can accept.
- [ ] "Forgot password" sends an email.
- [ ] Switch the language to Kiswahili and look through the pages.
- [ ] Rate limits work per person: on your phone, sign in with a wrong password 9 times in a
      row; the site should say "Too many attempts". Then, from a different network (e.g. a
      friend's phone on mobile data), signing in should still work. If both are blocked, or
      neither is, tell your developer: the `CLIENT_IP_HEADER` setting needs adjusting.
- [ ] Next morning: the admin summary email arrives (only when something is waiting).

## 6. Before inviting the public

- [ ] A Tanzanian lawyer has reviewed the privacy policy and terms (Personal Data Protection
      Act, 2022), and any registration with the Personal Data Protection Commission is done.
- [ ] A native Swahili speaker has read the Swahili text.
- [ ] Delete or archive anything you created while testing.
- [ ] Sign up your first 10–20 landlords and agents in one or two neighbourhoods
      (see `OPERATIONS.md` → onboarding).

## Optional: WhatsApp updates

Follow [WHATSAPP.md](WHATSAPP.md). When the templates are approved, set in the Render
environment group `dalali-shared`: `WHATSAPP_PROVIDER=cloud`, `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`. The opt-in checkbox then appears on the site.

## Backups

- **Database:** the paid Render PostgreSQL plan keeps automatic backups and can restore to an
  earlier point in time (database → _Recovery_). Check the retention period of your plan.
- **Extra monthly copy** (recommended): from a computer with PostgreSQL tools installed, copy
  the database's _External Connection String_ from Render and run
  `pg_dump --format=custom --no-owner "<connection string>" > dalali-YYYY-MM-DD.dump`.
  Keep the file somewhere private and encrypted: it contains personal data.
- **Restoring** that copy into an empty database:
  `pg_restore --no-owner --dbname "<connection string>" dalali-YYYY-MM-DD.dump`.
- Photos and documents live in R2, which stores data redundantly. Deleting files there is
  permanent, so keep the R2 token limited to this one bucket.

## If something goes wrong

- Site down: Render → website → **Logs**, and **Events** (a failed deploy keeps the previous
  version running). `/api/health` returns 503 when the database cannot be reached.
- A bad release: Render → website → **Events** → roll back to the previous deploy.
- Startup error mentioning _Invalid environment configuration_: a setting is missing or
  wrong; the message names it.
