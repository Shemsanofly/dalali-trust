import Link from "next/link";
import { advertiserProfileAction } from "@/app/actions/account";
import { ActionForm } from "@/components/ui/action-form";
import { PageHeader } from "@/components/ui/basics";
import { getDictionary } from "@/i18n/server";
import { REGIONS } from "@/lib/locations";
import { requirePageActor } from "@/server/session";
import { getMyAccount } from "@/server/services/users";

export default async function AdvertiserProfilePage() {
  const actor = await requirePageActor({ roles: ["LANDLORD", "AGENT"] });
  const { t } = await getDictionary();
  const me = await getMyAccount(actor);
  const p = me.advertiserProfile;
  return (
    <>
      <PageHeader
        title={t.dashboard.profile}
        subtitle={t.landlord.profile.subtitle}
        actions={
          <Link className="btn-secondary" href={`/advertisers/${actor.id}`}>
            View public page
          </Link>
        }
      />
      <section className="card p-5">
        <ActionForm action={advertiserProfileAction} submitLabel={t.common.save}>
          <div>
            <label className="label" htmlFor="displayName">
              Display name
            </label>
            <input
              className="input"
              id="displayName"
              name="displayName"
              defaultValue={p?.displayName ?? me.name}
              required
              maxLength={80}
            />
          </div>
          {actor.role === "AGENT" ? (
            <div>
              <label className="label" htmlFor="agencyName">
                Agency name ({t.common.optional})
              </label>
              <input
                className="input"
                id="agencyName"
                name="agencyName"
                defaultValue={p?.agencyName ?? ""}
                maxLength={120}
              />
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="bio">
              About you ({t.common.optional})
            </label>
            <textarea
              className="input"
              id="bio"
              name="bio"
              rows={4}
              maxLength={1000}
              defaultValue={p?.bio ?? ""}
            />
          </div>
          <p className="text-sm text-navy-600">{t.landlord.profile.companyContacts}</p>
          <fieldset>
            <legend className="label">{t.landlord.profile.regions}</legend>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {REGIONS.map((r) => (
                <label key={r.slug} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="serviceRegions"
                    value={r.slug}
                    defaultChecked={p?.serviceRegions.includes(r.slug)}
                    className="h-4 w-4 accent-brand-600"
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </fieldset>
        </ActionForm>
      </section>
    </>
  );
}
