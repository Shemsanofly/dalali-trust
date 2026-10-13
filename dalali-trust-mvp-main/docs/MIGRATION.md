# Legacy migration notes

The original SahaShares prototype is preserved, unchanged apart from the folder move, in `legacy-sahashares/`. It is **not built or deployed** by the new application. Deleting it later is the owners' decision.

## Feature mapping

| Legacy feature                                                                        | New status                                                                                          | Reason                                                                                                                               |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Phone + password signup, SMS OTP                                                      | Replaced by email + password (Better Auth). Phone stored as an optional, validated profile field    | SMS needs a paid, configured provider. Email reset works with a simple HTTPS provider. SMS OTP can be added later as a second factor |
| Property marketplace (investment shares)                                              | Replaced by rental listings with review, costs and availability                                     | Product refocus on rentals                                                                                                           |
| "AI KYC" / document extraction                                                        | Replaced by a **manual** verification workflow with private evidence storage and scoped decisions   | The legacy flow was simulated and fabricated registry results                                                                        |
| Fraud "flag" button                                                                   | Replaced by authenticated reports with categories, evidence, moderation, appeals and an audit trail | Unauthenticated, unreviewed flags                                                                                                    |
| Admin page                                                                            | Replaced by a server-authorized admin dashboard                                                     | Legacy check was client-side only                                                                                                    |
| Wallet, top-up, withdrawals, investments, dividends, B2C/B2B payouts, airtime bonuses | **Not migrated**                                                                                    | Custody of funds and investment products are explicitly out of scope and need licensing                                              |
| USSD / SMS keyword menus / voice bot                                                  | **Not migrated**                                                                                    | Built around wallets and investments. A rental-search USSD channel could be scoped later with a licensed aggregator                  |
| OpenAI "AI Broker"                                                                    | **Not migrated**                                                                                    | No product requirement in the rental MVP, and the legacy endpoint trusted client-supplied user IDs                                   |
| Analytics page                                                                        | Replaced by admin-only metrics and privacy-respecting event counts                                  | Legacy page exposed personal data publicly                                                                                           |
| EN/SW translations, palette, logo concept                                             | Kept / adapted                                                                                      | Branding continuity                                                                                                                  |

## Existing data

The repository contains no database dump, and the production MongoDB was not accessible from this environment, so **no data was migrated**. If a legacy MongoDB holds real data:

1. **Settle real money first.** If any wallet balances, investments or pending payments relate to real money (not sandbox), the owners must reconcile and refund them under legal advice before shutting the legacy service down. This is a legal and financial obligation, not a software task.
2. Run the read-only export, which never writes to MongoDB and omits password hashes, OTPs and NIDA numbers:
   ```bash
   npm install --no-save mongodb@6
   LEGACY_MONGODB_URI="mongodb+srv://..." npm run legacy:export -- ./legacy-export
   ```
3. Contact legacy users (phone numbers) to tell them about the change and invite them to register on Dalali Trust. Legacy passwords are not reused: they were bcrypt hashes tied to phone logins, and accounts now need an email.
4. Recreate genuine rental listings manually with the advertisers. Legacy "properties" lack rent, region and availability data and were "verified" by a simulated process, so they must not be imported as reviewed or verified.
5. Store the export as confidential data and delete it when no longer needed.
