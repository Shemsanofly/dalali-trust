import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  addListingImages,
  createListing,
  moderateListing,
  searchListings,
  submitListingForReview,
} from "@/server/services/listings";
import {
  addReportInformation,
  appealReport,
  createReport,
  decideReport,
  getReportEvidenceForDownload,
  listMyReports,
  listReportsAgainstMe,
} from "@/server/services/reports";
import {
  cancelViewing,
  createViewingRequest,
  listReceivedViewingRequests,
  respondToViewing,
} from "@/server/services/viewings";
import { createUser, pngFile, withCleanDatabase, validListingInput } from "./helpers/factories";

withCleanDatabase();

async function published() {
  const landlord = await createUser("LANDLORD");
  const admin = await createUser("ADMIN");
  const listing = await createListing(landlord, validListingInput());
  await addListingImages(landlord, listing.id, [await pngFile()]);
  await submitListingForReview(landlord, listing.id);
  await moderateListing(admin, listing.id, "APPROVE", "");
  return { landlord, admin, listing };
}

const inTwoDays = () => new Date(Date.now() + 2 * 86_400_000);

describe("reports", () => {
  it("lets a signed-in user report a listing with evidence", async () => {
    const { landlord, listing } = await published();
    const tenant = await createUser("TENANT");
    const report = await createReport(
      tenant,
      {
        propertyId: listing.id,
        category: "ADVANCE_PAYMENT_REQUEST",
        description: "The agent asked me to send a deposit by M-Pesa before any viewing.",
      },
      [await pngFile("screenshot.png")],
    );
    expect(report.status).toBe("SUBMITTED");
    expect(report.subjectUserId).toBe(landlord.id);
    expect(await prisma.reportEvidence.count({ where: { reportId: report.id } })).toBe(1);
  });

  it("does not automatically act on a listing because it was reported", async () => {
    const { listing } = await published();
    for (let i = 0; i < 3; i++) {
      await createReport(await createUser("TENANT"), {
        propertyId: listing.id,
        category: "OTHER",
        description: "I think this listing is suspicious for some reason.",
      });
    }
    expect((await prisma.property.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe("PUBLISHED");
    expect((await searchListings({})).total).toBe(1);
  });

  it("prevents duplicate open reports and self-reporting", async () => {
    const { landlord, listing } = await published();
    const tenant = await createUser("TENANT");
    const input = {
      propertyId: listing.id,
      category: "OTHER",
      description: "Price differs from what I was told on the phone.",
    };
    await createReport(tenant, input);
    await expect(createReport(tenant, input)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(createReport(landlord, input)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("requires a description and a valid category", async () => {
    const { listing } = await published();
    const tenant = await createUser("TENANT");
    await expect(
      createReport(tenant, { propertyId: listing.id, category: "OTHER", description: "short" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createReport(tenant, {
        propertyId: listing.id,
        category: "FRAUDSTER",
        description: "A long enough description of the issue.",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("supports the admin decision flow, suspension and an appeal by the reported advertiser", async () => {
    const { landlord, admin, listing } = await published();
    const tenant = await createUser("TENANT");
    const report = await createReport(tenant, {
      propertyId: listing.id,
      category: "UNAUTHORIZED_ADVERTISING",
      description: "The owner of this house says they never authorised this advert.",
    });

    await expect(
      decideReport(tenant, report.id, "DISMISS", { publicResponse: "nothing" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await decideReport(admin, report.id, "START_REVIEW", {});
    await decideReport(admin, report.id, "REQUEST_INFO", {
      publicResponse: "Please share the owner's contact",
    });
    await addReportInformation(tenant, report.id, "Owner contact shared privately: available on request");
    await decideReport(admin, report.id, "TAKE_ACTION", {
      publicResponse: "Listing suspended pending confirmation from the owner",
      internalNote: "Owner confirmed by phone call",
      suspendListing: true,
    });

    expect((await prisma.property.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe("SUSPENDED");
    expect((await searchListings({})).total).toBe(0);

    const mine = await listMyReports(tenant);
    expect(mine[0]!.status).toBe("ACTION_TAKEN");
    expect(JSON.stringify(mine)).not.toContain("Owner confirmed by phone call");

    const against = await listReportsAgainstMe(landlord);
    expect(JSON.stringify(against)).not.toContain(tenant.id);
    expect(JSON.stringify(against)).not.toContain("never authorised");

    await expect(appealReport(tenant, report.id, "I want to appeal this outcome")).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
    await appealReport(landlord, report.id, "I am the authorised agent; here is my agreement.");
    expect((await prisma.report.findUniqueOrThrow({ where: { id: report.id } })).status).toBe("APPEALED");
    await expect(appealReport(landlord, report.id, "Appealing a second time")).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
    expect(await prisma.moderationAction.count({ where: { reportId: report.id } })).toBeGreaterThanOrEqual(4);
  });

  it("hides report evidence from everyone except the reporter and admins", async () => {
    const { landlord, admin, listing } = await published();
    const tenant = await createUser("TENANT");
    const report = await createReport(
      tenant,
      {
        propertyId: listing.id,
        category: "OTHER",
        description: "Screenshot of a conversation attached here.",
      },
      [await pngFile()],
    );
    const ev = await prisma.reportEvidence.findFirstOrThrow({ where: { reportId: report.id } });
    await expect(getReportEvidenceForDownload(landlord, ev.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getReportEvidenceForDownload(await createUser("TENANT"), ev.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await getReportEvidenceForDownload(tenant, ev.id)).toBeTruthy();
    expect(await getReportEvidenceForDownload(admin, ev.id)).toBeTruthy();
  });
});

describe("viewing requests", () => {
  it("lets tenants request viewings of published listings", async () => {
    const { landlord, listing } = await published();
    const tenant = await createUser("TENANT");
    const vr = await createViewingRequest(tenant, {
      propertyId: listing.id,
      proposedAt: inTwoDays(),
      message: "Can I come Saturday?",
    });
    expect(vr.advertiserId).toBe(landlord.id);
    expect(
      await prisma.notification.count({ where: { userId: landlord.id, type: "viewing_requested" } }),
    ).toBe(1);
    await expect(
      createViewingRequest(tenant, { propertyId: listing.id, proposedAt: inTwoDays() }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects viewings of unpublished or own listings and invalid times", async () => {
    const { landlord, listing } = await published();
    const draft = await createListing(landlord, validListingInput());
    const tenant = await createUser("TENANT");
    await expect(
      createViewingRequest(tenant, { propertyId: draft.id, proposedAt: inTwoDays() }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      createViewingRequest(landlord, { propertyId: listing.id, proposedAt: inTwoDays() }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createViewingRequest(tenant, { propertyId: listing.id, proposedAt: new Date(Date.now() - 1000) }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("only the listing's advertiser can respond, and only the requester can cancel", async () => {
    const { landlord, listing } = await published();
    const tenant = await createUser("TENANT");
    const otherAdvertiser = await createUser("AGENT");
    const vr = await createViewingRequest(tenant, {
      propertyId: listing.id,
      proposedAt: inTwoDays(),
      contactPhone: "0712 345 678",
    });

    await expect(respondToViewing(otherAdvertiser, vr.id, "ACCEPT")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await listReceivedViewingRequests(otherAdvertiser)).toHaveLength(0);
    await expect(cancelViewing(await createUser("TENANT"), vr.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    const received = await listReceivedViewingRequests(landlord);
    expect(received[0]!.contactPhone).toBe("+255712345678");
    await respondToViewing(landlord, vr.id, "ACCEPT", "See you at 10am");
    await expect(respondToViewing(landlord, vr.id, "DECLINE")).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
    await cancelViewing(tenant, vr.id);
    expect((await prisma.viewingRequest.findUniqueOrThrow({ where: { id: vr.id } })).status).toBe(
      "CANCELLED",
    );
  });
});
