import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { notificationText } from "@/i18n/notification-text";
import { sw } from "@/i18n/sw";
import { prisma } from "@/server/db";
import {
  addListingImages,
  createListing,
  moderateListing,
  submitListingForReview,
} from "@/server/services/listings";
import { createViewingRequest } from "@/server/services/viewings";
import { createUser, pngFile, validListingInput, withCleanDatabase } from "./helpers/factories";

withCleanDatabase();

const TYPES = [
  "viewing_requested",
  "viewing_accepted",
  "viewing_declined",
  "viewing_cancelled",
  "listing_approve",
  "listing_reject",
  "listing_suspend",
  "listing_reinstate",
  "verification_verified",
  "verification_rejected",
  "verification_more_info_required",
  "verification_expired",
  "report_action_taken",
];

describe("notifications in the reader's language", () => {
  it("has English and Swahili text for every notification type", () => {
    for (const type of TYPES) {
      const data = { listing: "Chumba Sinza", reason: "Picha si wazi" };
      const e = notificationText(en.notices, type, data);
      const s = notificationText(sw.notices, type, data);
      expect(e, type).not.toBeNull();
      expect(s, type).not.toBeNull();
      expect(s!.title, type).not.toBe(e!.title);
      expect(s!.body).not.toMatch(/\{\w+\}/);
    }
  });

  it("keeps free text as written and falls back for older notifications", () => {
    expect(
      notificationText(sw.notices, "viewing_accepted", { listing: "Chumba", message: "Karibu Jumamosi" })
        ?.body,
    ).toBe('Ombi lako la kuangalia "Chumba" limekubaliwa. Ujumbe: Karibu Jumamosi');
    expect(
      notificationText(sw.notices, "report_dismissed", { response: "No evidence was found." })?.body,
    ).toBe("No evidence was found.");
    expect(notificationText(sw.notices, "viewing_requested", null)).toBeNull();
    expect(notificationText(sw.notices, "something_new", {})).toBeNull();
  });

  it("stores the values needed when real actions create notifications", async () => {
    const landlord = await createUser("LANDLORD");
    const admin = await createUser("ADMIN");
    const listing = await createListing(landlord, validListingInput());
    await addListingImages(landlord, listing.id, [await pngFile()]);
    await submitListingForReview(landlord, listing.id);
    await moderateListing(admin, listing.id, "APPROVE", "");
    await createViewingRequest(await createUser("TENANT"), {
      propertyId: listing.id,
      proposedAt: new Date(Date.now() + 2 * 86_400_000),
    });
    const notes = await prisma.notification.findMany({
      where: { userId: landlord.id },
      orderBy: { createdAt: "asc" },
    });
    expect(notes.map((n) => [n.type, n.data])).toEqual([
      ["listing_approve", { listing: listing.title }],
      ["viewing_requested", { listing: listing.title }],
    ]);
    expect(notificationText(sw.notices, notes[1]!.type, notes[1]!.data)?.title).toBe(
      "Ombi jipya la kuangalia",
    );
  });
});
