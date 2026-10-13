import { createListingAction } from "@/app/actions/listings";
import { ListingForm } from "@/components/listing/listing-form";
import { Notice, PageHeader } from "@/components/ui/basics";
import { getDictionary } from "@/i18n/server";
import { requirePageActor } from "@/server/session";

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  await requirePageActor({ roles: ["LANDLORD", "AGENT"] });
  const { welcome } = await searchParams;
  const { t } = await getDictionary();
  return (
    <>
      <PageHeader
        title={t.dashboard.newListing}
        subtitle="Step 1 of 3: details. Next you will add photos, then submit for review."
      />
      {welcome ? (
        <div className="mb-4">
          <Notice tone="green">
            Karibu! Your account is ready. Start by adding your first property — it stays a private draft
            until you submit it.
          </Notice>
        </div>
      ) : null}
      <ListingForm
        action={createListingAction}
        defaults={{}}
        t={t.property}
        submitLabel="Save draft and add photos"
      />
    </>
  );
}
