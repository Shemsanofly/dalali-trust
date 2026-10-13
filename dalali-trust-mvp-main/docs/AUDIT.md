# Repository audit (Phase 1)

Audit of `dalali-trust-mvp-main/` as found in the initial commit (`ccc8d4e`). Every file listed here was read.

## What the existing application was

The code was **"SahaShares"**, a hackathon-style prototype for **fractional micro-investment in commercial property**, with a secondary "anti-scam verification" theme. It was not a rental-listing platform.

| Layer        | Found                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Backend      | Node 20 + Express 4 (`server.js`, plus a duplicated serverless entry `api/index.js` for Vercel)                                        |
| Database     | MongoDB via Mongoose 8. Fell back silently to "MOCK mode" (no persistence) if `MONGODB_URI` was missing                                |
| Frontend     | React 19 + Vite 7 + React Router 7 + Tailwind 4 SPA (`client/`), plus an unrelated 1,464-line static `public/index.html`               |
| Auth         | Phone number + password (bcrypt), SMS OTP via Africa's Talking, JWT (7 days) in `localStorage`, Bearer header                          |
| Integrations | Africa's Talking (SMS, USSD, Voice, Airtime, Payments C2B/B2C/B2B), OpenAI "AI Broker" chat with function calling                      |
| Models       | `User` (with wallet balances), `Property` (share-funding fields), `Investment`, `LedgerTransaction`, `PendingPayment`, `AIInteraction` |
| Tests        | None. `client/build-log.txt` recorded a failed Windows build                                                                           |
| Deployment   | `vercel.json` (SPA + serverless API) and Railway instructions in the README                                                            |

## Feature status

| Feature                                        | Status                                                                                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signup / OTP / login / password reset by SMS   | Functional if Africa's Talking is configured. The OTP is logged to the console when SMS fails                                                                                                  |
| Property "marketplace" (investment shares)     | Functional against MongoDB, but it is an investment product rather than rental listings                                                                                                        |
| Wallet top-up                                  | **Credits the wallet directly with no payment** (`POST /api/auth/topup`). Simulated money                                                                                                      |
| Withdrawals, B2C/B2B payouts, dividends script | Simulated/sandbox. Real-money logic without licensing or controls                                                                                                                              |
| "AI KYC verification" (`routes/kyc.js`)        | **Mocked**: random 90% "match" and a fabricated land-registry response (`CT No.`, plot, block, `ACTIVE_NO_ENCUMBRANCES`). Uploaded NIDA IDs and title deeds were discarded or stored as base64 |
| "AI document extraction"                       | **Mocked**: returns a hard-coded name ("JUMA RASHIDI MWANGI") and random NIDA number                                                                                                           |
| Fraud flagging                                 | Anyone (unauthenticated) could append to `flaggedBy`                                                                                                                                           |
| Admin dashboard                                | Client-side role check only; the APIs it called were public                                                                                                                                    |
| USSD / SMS keywords / voice bot                | Functional against the Africa's Talking sandbox; investment-centric                                                                                                                            |
| Analytics page                                 | Public endpoint exposing investor names and phone numbers                                                                                                                                      |

## Security problems found

1. **No server-side authorization on admin data:** `GET /api/properties` (flagged queue), `GET /api/analytics/overview` and `GET /api/invest/properties` were public and returned owner/investor **full names and phone numbers**.
2. **`POST /api/ai/chat` trusted `userId` from the request body**, so anyone could act as any user through the AI broker's tools, including investment execution.
3. **`POST /api/airtime/dividend` was unauthenticated** and could send real airtime to any number.
4. **`POST /api/invest/deposit` and `/payments/callback` webhooks had no signature verification**, so anyone could credit a wallet.
5. **`POST /api/auth/topup` credited balances without any payment.**
6. **Fabricated verification:** fake registry data presented to users as fact, and properties auto-published as "VERIFIED".
7. **Sensitive documents:** NIDA and title-deed images were accepted with no defined purpose and no access control. Property images were stored as base64 inside the database.
8. **Weak auth details:** OTP generated with `Math.random`, OTPs logged in plaintext on SMS failure, no rate limiting anywhere, 6-character minimum password, JWT stored in `localStorage` (exposed to XSS), no session revocation.
9. **Mass assignment:** `PUT /api/properties/:id` let owners set `titleDeedStatus` / `hasDispute` themselves.
10. **No security headers, no CSRF consideration, no input validation library**, and error messages echoed internal `err.message` to clients.
11. **Misleading claims in UI copy:** "100% Scam Protection", "Zero scammers", "Up to 12% monthly ROI".

No committed secrets were found (`.env` was git-ignored; `.env.example` contains placeholders only). `npm_install.log` and `client/build-log.txt` were removed as noise.

## Reusable assets

- The design tokens (navy / green / gold palette, Plus Jakarta Sans) in `client/src/index.css` were carried over into `src/app/globals.css`.
- The English/Swahili approach (`client/src/translations.js`) was kept, re-implemented server-side.
- `toE164` phone normalisation became `src/lib/phone.ts` with stricter validation.
- The integer-money discipline (amounts never stored as floats) was kept. Rent is stored as integer TZS.

## Decisions

- **Build the Next.js app in place and move the prototype to `legacy-sahashares/` with `git mv`.** Nothing was deleted, history is preserved, and the legacy app is not deployed.
- **Do not port** wallets, investments, payouts, USSD investing or the AI broker. They are outside the rental MVP, they involve custody of customer funds (explicitly excluded), and several were unsafe. See [MIGRATION.md](MIGRATION.md).
- **No automatic data migration.** The repository contains no data, legacy users are phone-only with no email, and legacy records are investment shells without rent, region or availability. A read-only export script is provided instead.
