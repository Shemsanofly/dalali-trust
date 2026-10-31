# WhatsApp updates

Estate can send short WhatsApp messages for the moments that matter. Every message is
also available as a notification in the dashboard, so WhatsApp is an extra, never the only channel.

| When                                | Who gets it | Template                      |
| ----------------------------------- | ----------- | ----------------------------- |
| A tenant requests a viewing         | Advertiser  | `dalali_viewing_requested`    |
| The advertiser accepts the viewing  | Tenant      | `dalali_viewing_accepted`     |
| The advertiser declines the viewing | Tenant      | `dalali_viewing_declined`     |
| A moderator publishes a listing     | Advertiser  | `dalali_listing_published`    |
| A moderator does not approve it     | Advertiser  | `dalali_listing_not_approved` |

Only people who **opted in** (a checkbox at sign-up and in Account settings, which needs a mobile
number) receive messages, in the language saved on their account (English or Swahili). The
checkbox is only shown once WhatsApp is configured, so nobody is promised messages that cannot be sent.

The same updates can also go out by SMS through Africa's Talking: see [AFRICASTALKING.md](AFRICASTALKING.md).
Free "chat on WhatsApp" links between tenants and advertisers already work
without any of this; the setup below is only for the automatic messages above.

## One-time setup with Meta

Automatic messages need Meta's **WhatsApp Business Platform** (Cloud API), not the normal WhatsApp
or WhatsApp Business app. Meta's screens change often; follow Meta's current "Get started" guide
for the Cloud API alongside these steps.

1. **Meta Business account.** Create one at business.facebook.com and complete **business
   verification** (company documents). Unverified accounts can only message a few test numbers.
2. **App.** At developers.facebook.com create an app of type _Business_ and add the **WhatsApp** product.
3. **Phone number.** Add a phone number for Estate. It must not be in use on the WhatsApp
   app (a new SIM is simplest). Set the display name to "Estate" and wait for approval.
4. **Access token.** In Business Settings create a **system user**, give it the app and the WhatsApp
   account, and generate a permanent token with `whatsapp_business_messaging` and
   `whatsapp_business_management` permissions. Keep it secret.
5. **Templates.** In WhatsApp Manager create the five templates below. Category: **Utility**.
   Add both languages, **English (`en`)** and **Swahili (`sw`)**, with the text exactly as written
   (`{{1}}`, `{{2}}`… are filled in by the app). Wait until each shows as _Approved_.
6. **Configure the app** (hosting environment variables):
   ```
   WHATSAPP_PROVIDER=cloud
   WHATSAPP_ACCESS_TOKEN=<the permanent token>
   WHATSAPP_PHONE_NUMBER_ID=<"Phone number ID" from the WhatsApp API setup page, not the phone number>
   WHATSAPP_API_VERSION=<the current Graph API version shown by Meta, e.g. v21.0>
   ```
7. **Schedule** `npm run jobs:send-whatsapp` every 15 minutes. Messages are normally sent
   immediately; this job only retries ones interrupted by a restart.
8. **Test**: turn on WhatsApp updates for your own account, request a viewing of a test listing
   from another account, and check that your phone receives the message.

**Cost:** Meta charges per delivered template message, by country and category. Check the current
rates for Tanzania (utility category) on Meta's WhatsApp pricing page before launch.

## Templates

`dalali_viewing_requested` — variables: listing title, date and time (EAT), dashboard link

- en: New viewing request for {{1}} on {{2}}. Accept or decline it in your Estate dashboard: {{3}}
- sw: Ombi jipya la kuangalia {{1}} tarehe {{2}}. Likubali au ulikatae kwenye dashibodi yako ya Estate: {{3}}

`dalali_viewing_accepted` — variables: listing title, date and time (EAT), dashboard link

- en: Good news: your viewing request for {{1}} on {{2}} was accepted. Details: {{3}} Never pay before you have seen the home.
- sw: Habari njema: ombi lako la kuangalia {{1}} tarehe {{2}} limekubaliwa. Maelezo: {{3}} Usilipe kabla ya kuona nyumba.

`dalali_viewing_declined` — variables: listing title, search link

- en: Your viewing request for {{1}} was declined. See other homes on Estate: {{2}}
- sw: Ombi lako la kuangalia {{1}} halikukubaliwa. Ona nyumba nyingine kwenye Estate: {{2}}

`dalali_listing_published` — variables: listing title, public listing link

- en: Your listing {{1}} has been reviewed and is now live on Estate: {{2}}
- sw: Tangazo lako {{1}} limekaguliwa na sasa liko hewani kwenye Estate: {{2}}

`dalali_listing_not_approved` — variables: listing title, moderator's note, listing link

- en: Your listing {{1}} was not approved yet. Moderator's note: {{2}}. Fix it and submit again: {{3}}
- sw: Tangazo lako {{1}} bado halijakubaliwa. Maelezo ya msimamizi: {{2}}. Lirekebishe kisha ulitume tena: {{3}}

The wording lives in `src/server/whatsapp-templates.ts`. If you change it there, change the
templates in WhatsApp Manager too (Meta re-reviews edited templates).

## Development and troubleshooting

- `WHATSAPP_PROVIDER=console` prints each message to the server log instead of sending it.
  Not allowed in production.
- Delivery status is stored on each notification (`whatsappStatus`: PENDING, SENDING, SENT,
  FAILED, with `whatsappError`). Common errors: template not approved or name/language
  mismatch, expired token, or a recipient number without WhatsApp.
- People who turn updates off before a queued message goes out do not receive it.
