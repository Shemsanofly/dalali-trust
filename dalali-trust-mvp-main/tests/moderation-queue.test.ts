import { describe, expect, it } from "vitest";
import { addListingImages, createListing, submitListingForReview } from "@/server/services/listings";
import { moderationDigest, moderationQueue } from "@/server/services/moderation-queue";
import { createReport } from "@/server/services/reports";
import { createUser, pngFile, validListingInput, withCleanDatabase } from "./helpers/factories";

withCleanDatabase();

describe("moderation queue", () => {
  it("counts listings waiting for review and flags urgent reports", async () => {
    expect((await moderationQueue()).total).toBe(0);

    const landlord = await createUser("LANDLORD");
    const listing = await createListing(landlord, validListingInput());
    await addListingImages(landlord, listing.id, [await pngFile()]);
    await submitListingForReview(landlord, listing.id);
    await createListing(landlord, validListingInput({ title: "A draft that is not submitted" }));
    await createReport(await createUser("TENANT"), {
      propertyId: listing.id,
      category: "ADVANCE_PAYMENT_REQUEST",
      description: "The agent asked me to send money by M-Pesa before any viewing.",
    });

    const q = await moderationQueue();
    expect(q).toMatchObject({ listings: 1, verifications: 0, reports: 1, urgentReports: 1, total: 2 });
    expect(q.oldestListingSubmittedAt).toBeInstanceOf(Date);
  });
});

describe("daily moderation summary", () => {
  const base = {
    listings: 0,
    verifications: 0,
    reports: 0,
    urgentReports: 0,
    oldestListingSubmittedAt: null,
    total: 0,
  };

  it("sends nothing when the queue is empty", () => {
    expect(moderationDigest(base, "https://dalalitrust.example")).toBeNull();
  });

  it("summarises waiting work, flags urgent reports and links to the admin area", () => {
    const now = new Date("2026-10-20T06:00:00Z");
    const digest = moderationDigest(
      {
        ...base,
        listings: 2,
        reports: 1,
        urgentReports: 1,
        oldestListingSubmittedAt: new Date("2026-10-17T06:00:00Z"),
        total: 3,
      },
      "https://dalalitrust.example",
      now,
    );
    expect(digest?.subject).toBe("Estate: 3 items waiting for review, 1 urgent");
    expect(digest?.text).toContain("Listings awaiting review: 2 (oldest waiting 3 days)");
    expect(digest?.text).toContain("1 urgent");
    expect(digest?.text).toContain("https://dalalitrust.example/admin");
  });
});
