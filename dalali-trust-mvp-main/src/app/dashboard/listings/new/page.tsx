import { createListingAction } from "@/app/actions/listings";
import { ListingForm } from "@/components/listing/listing-form";
import { StepGuide } from "@/components/listing/step-guide";
import { Notice, PageHeader } from "@/components/ui/basics";
import { getDictionary } from "@/i18n/server";
import { requirePageActor } from "@/server/session";

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const actor = await requirePageActor({ roles: ["LANDLORD", "AGENT"] });
  const { welcome } = await searchParams;
  const { t } = await getDictionary();
  return (
    <>
      <PageHeader title={t.dashboard.newListing} subtitle={t.landlord.newSubtitle} />
      <StepGuide t={t.landlord.steps} current={1} />
      {welcome ? (
        <div className="mb-4">
          <Notice tone="green">{t.landlord.welcome}</Notice>
        </div>
      ) : null}
      <ListingForm
        action={createListingAction}
        role={actor.role === "AGENT" ? "AGENT" : "LANDLORD"}
        defaults={{}}
        t={t.property}
        tf={t.landlord.form}
        submitLabel={t.landlord.saveDraft}
      />
    </>
  );
}
