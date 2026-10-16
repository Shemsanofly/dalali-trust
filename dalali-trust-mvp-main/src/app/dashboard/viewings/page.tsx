import Link from "next/link";
import { cancelViewingAction } from "@/app/actions/tenant";
import { respondViewingAction } from "@/app/actions/listings";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/basics";
import { getDictionary } from "@/i18n/server";
import { formatDateTime } from "@/lib/dates";
import { formatTzPhone } from "@/lib/phone";
import { isAdvertiser } from "@/server/actor";
import { requirePageActor } from "@/server/session";
import { listMyViewingRequests, listReceivedViewingRequests } from "@/server/services/viewings";

export default async function ViewingsPage() {
  const actor = await requirePageActor();
  const { locale, t } = await getDictionary();
  const advertiser = isAdvertiser(actor);
  const [mine, received] = await Promise.all([
    listMyViewingRequests(actor),
    advertiser ? listReceivedViewingRequests(actor) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title={t.dashboard.viewings} />
      {advertiser ? (
        <section className="mb-8">
          {received.length === 0 ? (
            <EmptyState title={t.dashboard.emptyViewings} />
          ) : (
            <ul className="space-y-3">
              {received.map((v) => {
                const phone = v.contactPhone ?? v.requester.phoneNumber;
                return (
                  <li key={v.id} className="card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link href={`/properties/${v.property.slug}`} className="font-semibold underline">
                          {v.property.title}
                        </Link>
                        <p className="text-sm text-navy-600">
                          {v.requester.name} · {formatDateTime(v.proposedAt, locale)}
                        </p>
                        {phone ? (
                          <p className="text-sm">
                            <a className="underline" href={`tel:${phone}`}>
                              {formatTzPhone(phone)}
                            </a>
                          </p>
                        ) : null}
                      </div>
                      <StatusBadge status={v.status} label={t.viewing.statuses[v.status]} />
                    </div>
                    {v.message ? (
                      <p className="mt-2 rounded-lg bg-navy-50 p-3 text-sm whitespace-pre-line">
                        {v.message}
                      </p>
                    ) : null}
                    {v.status === "PENDING" || v.status === "ACCEPTED" ? (
                      <ActionForm
                        action={respondViewingAction}
                        submitLabel={
                          v.status === "PENDING" ? t.landlord.viewings.accept : t.landlord.viewings.complete
                        }
                        submitName="decision"
                        submitValue={v.status === "PENDING" ? "ACCEPT" : "COMPLETE"}
                        className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"
                        submitClassName="btn-primary"
                      >
                        <input type="hidden" name="id" value={v.id} />
                        <input
                          className="input"
                          name="message"
                          maxLength={1000}
                          placeholder={t.landlord.viewings.reply}
                          aria-label={t.landlord.viewings.replyLabel}
                        />
                        {v.status === "PENDING" ? (
                          <SubmitButton className="btn-secondary" name="decision" value="DECLINE">
                            {t.landlord.viewings.decline}
                          </SubmitButton>
                        ) : null}
                      </ActionForm>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {!advertiser || mine.length ? (
        <section>
          {advertiser ? <h2 className="mb-3 text-lg font-bold">{t.landlord.viewings.sent}</h2> : null}
          {mine.length === 0 ? (
            <EmptyState
              title={t.dashboard.emptyViewings}
              action={{ href: "/properties", label: t.dashboard.emptySavedCta }}
            />
          ) : (
            <ul className="space-y-3">
              {mine.map((v) => (
                <li key={v.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/properties/${v.property.slug}`} className="font-semibold underline">
                        {v.property.title}
                      </Link>
                      <p className="text-sm text-navy-600">
                        {v.property.neighborhood}, {v.property.district} ·{" "}
                        {formatDateTime(v.proposedAt, locale)}
                      </p>
                    </div>
                    <StatusBadge status={v.status} label={t.viewing.statuses[v.status]} />
                  </div>
                  {v.responseMessage ? (
                    <p className="mt-2 rounded-lg bg-brand-50 p-3 text-sm">{v.responseMessage}</p>
                  ) : null}
                  {v.status === "PENDING" || v.status === "ACCEPTED" ? (
                    <form action={cancelViewingAction} className="mt-3">
                      <input type="hidden" name="id" value={v.id} />
                      <button type="submit" className="btn-secondary">
                        {t.dashboard.cancel}
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </>
  );
}
