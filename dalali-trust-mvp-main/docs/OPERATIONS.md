# Operations: moderation, manual verification and launch

This is the working playbook for the first months. Keep it short, follow it consistently, and change it based on what you learn.

## 1. Listing review (target: within 2 working days)

You do not need to keep checking: the **Admin** link in the header shows how many items are waiting (red when an urgent report is open), and the morning summary email (`jobs:admin-digest`) lists the queue.

Open **Admin → Listings** (oldest first). For each listing, check:

1. **Photos** look like a real, specific property: not stock images, not watermarked from another site, consistent with the description. Use the _Possible duplicates_ panel. A match is a prompt to look closer, never proof.
2. **Costs are complete**: rent, months in advance, deposit, agent fee and other charges. Reject listings that hide costs ("call for price").
3. **No request for payment before viewing**, in the description or elsewhere.
4. **Plausible price and location** for the area.
5. **Agents**: the listing should be consistent with the agent being authorised (ask for the ADVERTISER_ROLE or PROPERTY_EVIDENCE check if unsure).

Decisions: _Approve_, _Reject_ (with a clear, polite reason the advertiser can act on), or _Suspend_ (published listings with a serious problem). Every decision is recorded with your name.

## 2. Manual verification (scope matters)

There is **no API access to NIDA, the Ministry of Lands (e.g. e-Ardhi) or any other registry**. Each check is a human comparison of documents the advertiser chooses to submit. Never imply more than that.

| Check                          | Accept                                                                                                                  | Verify when                                                                                                                     | Never claim                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Identity                       | NIDA card, passport, driving licence, voter ID, plus a selfie holding it                                                | Name matches the account and the face matches the selfie. Document not obviously altered or expired                             | That the person is honest, or owns anything |
| Landlord / agent authorisation | Management agreement, owner's authorisation letter, business licence                                                    | Document names this person and appears genuine. For agents: the owner's contact details are present (optionally call the owner) | Legal authority. Registry confirmation      |
| Property evidence              | Recent utility bill for the address, owner's authorisation naming the property, photo of the advertiser at the property | Address and name are consistent with the listing                                                                                | Legal ownership or title                    |

Rules:

- **Edit the scope statement** if you checked something different from the default text. It is shown publicly.
- Use **Request more information** rather than rejecting when a document is unclear.
- **Never download documents** to personal devices, screenshot them or share them. Opening a document is logged.
- **Do not review** requests from people you know personally. Ask another reviewer.
- Verifications expire after 365 days by default, and documents are deleted 180 days after the decision.

## 3. Reports

Open **Admin → Reports**. A report is an **allegation**, not a finding.

1. _Start review_. Read the report, the evidence, the listing, the advertiser's history and the **reporter's history** (many dismissed reports can indicate retaliation).
2. If needed, _Request more information_ from the reporter, or contact the advertiser for their side.
3. Decide:
   - _Action taken_ (optionally suspend the listing and/or account) with a factual response, e.g. "Listing suspended: the owner told us they did not authorise this advert."
   - _Dismiss_ with a short reason.
4. Write facts, not labels. Never call anyone a "scammer" or "criminal" in responses or notes.
5. Appeals: either party can appeal once. If possible, a **different** moderator should handle the appeal.
6. If someone has lost money, advise them to report to the police and their mobile-money provider. Dalali Trust does not investigate crimes.

Prioritise: `ADVANCE_PAYMENT_REQUEST` and `IMPERSONATION` the same day. Other categories within 3 working days.

## 4. Onboarding the first landlords and agents

1. Pick 1–2 neighbourhoods (e.g. Sinza and Mikocheni) and recruit 10–20 advertisers personally: landlords from community groups, and agents with good local reputations.
2. Meet them, explain the rules (complete costs, real photos, no payment before viewing) and help them create accounts. The `/for-advertisers` page summarises this.
3. Help them take good photos (daylight, every room, the access road).
4. Encourage the identity check first, and authorisation or property evidence for agents.
5. Ask them to confirm availability weekly and to archive rented properties.
6. Collect feedback after 2 and 6 weeks (dashboard feedback form or in person).

## 5. Validating the product hypotheses

The home page states problems as **hypotheses**. Before scaling, interview at least 15 tenants and 10 landlords/agents and track:

- Share of viewing requests that lead to an actual viewing (ask tenants).
- Share of listings still available when tenants call (stale-availability warnings, reports of incorrect availability).
- Report volume by category, and how many reports led to action.
- Time from submission to listing approval, and from submission to verification decision.
- Advertiser retention (listings confirmed or updated after 30 days).

Admin → Overview shows counts. Use `analytics_event` (no personal data) for funnels: `listing_view → contact_reveal / viewing_requested`.

## 6. Messages and integrations

Every update appears as an in-app notification. **WhatsApp updates** for viewing requests and listing reviews are sent only to people who opted in, once WhatsApp is configured ([WHATSAPP.md](WHATSAPP.md)). There is no SMS. Email is used for password resets (with `EMAIL_PROVIDER=resend`) and the morning moderation summary. The app never claims a message was sent unless a provider actually accepted it. The "WhatsApp" and phone buttons on listings simply open the user's own app.

## 7. Payments: not in the MVP

Dalali Trust does not take deposits, rent or fees and does not hold funds. Before any payment feature, assess licensing (e.g. Bank of Tanzania rules on payment systems and e-money), consumer protection, fraud and chargeback handling, provider integration and tax with qualified advisers.
