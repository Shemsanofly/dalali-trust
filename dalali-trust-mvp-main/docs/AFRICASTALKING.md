# SMS and USSD (Africa's Talking)

Estate can use [Africa's Talking](https://africastalking.com) for two things:

1. **SMS updates.** The same moments as the [WhatsApp updates](WHATSAPP.md) (viewing requested,
   accepted or declined; listing published or not approved), sent as SMS, which works on any phone.
   Only people who **opted in** (a checkbox at sign-up and in Account settings, which needs a mobile
   number) get them, in the language saved on their account. The checkbox is only shown once SMS is
   configured. Every SMS is also an in-app notification.
2. **USSD rental search** (`POST /api/ussd`). People dial a code such as `*384*12345#`, choose
   English or Kiswahili, pick a region and a budget, browse published homes (cheapest first) and
   can get a listing's details by SMS on their own number. It only reads public listing data: no
   sign-in, no payments, no private information.

Start with the **sandbox**: it is free, needs no approval and comes with a phone simulator.

## Configuration

| Variable              | Meaning                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| `SMS_PROVIDER`        | `none` (off, default), `console` (print SMS to the server log, development only), `africastalking`    |
| `AT_USERNAME`         | Africa's Talking app username. `sandbox` uses `api.sandbox.africastalking.com`; anything else is live |
| `AT_API_KEY`          | API key of that app. Required when `SMS_PROVIDER=africastalking`                                      |
| `AT_SENDER_ID`        | Optional registered alphanumeric sender ID or short code (live only). Empty = shared default          |
| `USSD_ENABLED`        | `true` to answer USSD callbacks. Otherwise `/api/ussd` returns 404                                    |
| `USSD_CALLBACK_TOKEN` | Secret (16+ characters) that must be in the callback URL. Africa's Talking does not sign requests     |
| `USSD_SERVICE_CODE`   | The code people dial, for display only                                                                |

## Sandbox walk-through (simulation)

1. **Account.** Sign up at [account.africastalking.com](https://account.africastalking.com) and
   open the **Sandbox** app (top of the dashboard, "Go to sandbox app").
2. **API key.** In the sandbox app: **Settings → API Key**, generate a key and copy it.
3. **Environment** (`.env`):
   ```
   SMS_PROVIDER=africastalking
   AT_USERNAME=sandbox
   AT_API_KEY=<sandbox API key>
   USSD_ENABLED=true
   USSD_CALLBACK_TOKEN=<random string, e.g. node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))">
   ```
   Restart `npm run dev` after changing `.env`.
4. **Public address for your laptop.** Africa's Talking must reach your app over HTTPS. Use a
   tunnel, for example `cloudflared tunnel --url http://localhost:3000` or `ngrok http 3000`, and
   note the `https://…` address it prints. (A deployed staging site works too.)
5. **USSD channel.** In the sandbox app: **USSD → Create Channel**. Pick a shared code (e.g.
   `*384*`) and a channel number; the code to dial becomes something like `*384*12345#`. Set the
   **callback URL** to:
   ```
   https://<your tunnel or site>/api/ussd?token=<USSD_CALLBACK_TOKEN>
   ```
6. **Simulator.** Open [simulator.africastalking.com](https://simulator.africastalking.com), enter
   a phone number (e.g. `+255712345678`) and launch it.
   - **USSD:** dial your code. You should see "Estate · 1. English · 2. Kiswahili". Search
     for a home (sample data: `npm run db:seed`), open one and choose "SMS me details".
   - **SMS:** the details SMS arrives in the simulator's **Messages** for the same number. To test
     notification SMS, put the same number on an account, tick "Send me important updates by SMS"
     in Account settings, and request a viewing of that account's listing from another account.
7. **Quick check without the menu:** `npm run sms:test -- +255712345678` sends one test SMS with
   the current settings and prints the result. With the sandbox it shows in the simulator.

Without a tunnel you can still develop: `SMS_PROVIDER=console` prints every SMS to the server log,
and the menu can be exercised directly:

```bash
curl -X POST "http://localhost:3000/api/ussd?token=$USSD_CALLBACK_TOKEN" \
  -d sessionId=test -d serviceCode='*384*1#' -d phoneNumber=+255712345678 -d text='1*1'
```

(`text` holds every answer so far, separated by `*`, exactly as Africa's Talking sends it.)

## USSD menu

```
Estate                    1 English / 2 Kiswahili
└─ 1 Find a home to rent  →  region (busiest first, 9 = more)
   →  budget (≤150k, ≤300k, ≤500k, ≤1M, any)
   →  homes, cheapest first, occupied ones hidden (4 per screen, 9 = more)
   →  details: rent, move-in total, availability, "Advertiser ID checked" when verified
      └─ 1 SMS me details  (title, place, costs, contact if public, link, safety reminder)
└─ 2 Safety tips
└─ 3 Contact us  (SUPPORT_PHONE, SUPPORT_EMAIL, site address)
0 = back one screen · 00 = main menu
```

Screens are kept within the 182 characters Africa's Talking displays. The wording lives in
`src/server/ussd.ts`; tests in `tests/sms-ussd.test.ts`.

**Limits:** 120 USSD requests per caller per 10 minutes and 5 details SMS per caller per hour
(`RATE_RULES` in `src/server/rate-limit.ts`). Callers are identified by a keyed hash of their
number; raw numbers are not stored. Analytics records only `ussd_listing_view` and
`ussd_sms_details` with the listing id.

## Going live

1. In the Africa's Talking dashboard create a **live app** (Tanzania), top up the account and,
   if you want a branded sender, apply for an **alphanumeric sender ID** (Tanzanian networks need
   one registered for each brand; this takes time).
2. Get a **USSD code**: a shared-code channel from Africa's Talking, or a dedicated code. In
   Tanzania USSD and bulk SMS services are regulated by TCRA; Africa's Talking (as the licensed
   aggregator) handles the network side, but check what registration Estate itself needs.
3. Set `AT_USERNAME` and `AT_API_KEY` to the live app's values, `AT_SENDER_ID` if approved,
   `SMS_PROVIDER=africastalking`, `USSD_ENABLED=true`, a long random `USSD_CALLBACK_TOKEN`, and
   point the live channel's callback URL at `https://<APP_URL host>/api/ussd?token=…`.
4. **Schedule** `npm run jobs:send-sms` every 15 minutes (the Render blueprint already has
   `dalali-send-sms`). SMS are normally sent immediately; this job only retries ones interrupted
   by a restart.

**Cost:** live SMS and USSD sessions are charged per message / per session at Tanzanian network
rates. Check current prices in the Africa's Talking dashboard before launch.

## Troubleshooting

- Delivery status is stored on each notification (`smsStatus`: PENDING, SENDING, SENT, FAILED,
  with `smsError`). Common errors: `HTTP 401` (wrong key, or a live key with `AT_USERNAME=sandbox`),
  `InvalidSenderId (402)`, `InvalidPhoneNumber (403)`, `InsufficientBalance (405)`.
- The simulator shows nothing for USSD: check that the tunnel is running, that the callback URL
  includes the right `token` (a wrong one returns 403), and that `USSD_ENABLED=true`.
- People who turn SMS updates off before a queued message goes out do not receive it.
