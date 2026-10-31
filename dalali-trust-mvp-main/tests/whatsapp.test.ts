// Messages are printed instead of sent ("console" provider), set before the env is first read.
process.env.WHATSAPP_PROVIDER = "console";

import { afterEach, describe, expect, it, vi } from "vitest";
import { formatEatNumeric } from "@/lib/dates";
import { prisma } from "@/server/db";
import {
  addListingImages,
  createListing,
  moderateListing,
  submitListingForReview,
} from "@/server/services/listings";
import { createViewingRequest, respondToViewing } from "@/server/services/viewings";
import { updateProfile } from "@/server/services/users";
import { deliverPendingWhatsApp, requeueStuckWhatsApp } from "@/server/whatsapp";
import { cleanParam, renderTemplate, WHATSAPP_TEMPLATES } from "@/server/whatsapp-templates";
import { createUser, pngFile, validListingInput, withCleanDatabase } from "./helpers/factories";

withCleanDatabase();
afterEach(() => vi.restoreAllMocks());

async function optIn(userId: string, locale: "en" | "sw" = "en") {
  await prisma.user.update({
    where: { id: userId },
    data: { phoneNumber: "+255712345678", whatsappUpdates: true, locale },
  });
}

async function publishedListing() {
  const landlord = await createUser("LANDLORD");
  const admin = await createUser("ADMIN");
  const listing = await createListing(landlord, validListingInput());
  await addListingImages(landlord, listing.id, [await pngFile()]);
  await submitListingForReview(landlord, listing.id);
  await moderateListing(admin, listing.id, "APPROVE", "");
  return { landlord, admin, listing };
}

const inTwoDays = () => new Date(Date.now() + 2 * 86_400_000);

describe("WhatsApp templates", () => {
  it("uses the same placeholders in English and Swahili", () => {
    for (const t of Object.values(WHATSAPP_TEMPLATES)) {
      const en = [...t.en.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]).sort();
      const sw = [...t.sw.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]).sort();
      expect(sw).toEqual(en);
    }
  });
  it("cleans parameters the way Meta requires and renders messages", () => {
    expect(cleanParam("Line one\nline   two\t ")).toBe("Line one line two");
    expect(cleanParam("")).toBe("-");
    expect(cleanParam("x".repeat(300)).length).toBe(200);
    expect(
      renderTemplate("dalali_viewing_declined", "sw", ["Chumba Sinza", "https://x.test/properties"]),
    ).toBe(
      "Ombi lako la kuangalia Chumba Sinza halikukubaliwa. Ona nyumba nyingine kwenye Estate: https://x.test/properties",
    );
  });
  it("formats viewing times in East Africa Time", () => {
    expect(formatEatNumeric(new Date("2026-10-25T07:00:00Z"))).toBe("25/10/2026 10:00");
  });
});

describe("WhatsApp updates", () => {
  it("queues and sends a message to an advertiser who opted in", async () => {
    const { landlord, listing } = await publishedListing();
    await optIn(landlord.id);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const tenant = await createUser("TENANT");
    const when = inTwoDays();
    await createViewingRequest(tenant, { propertyId: listing.id, proposedAt: when });

    const queued = await prisma.notification.findFirstOrThrow({
      where: { userId: landlord.id, type: "viewing_requested" },
    });
    expect(queued.whatsappStatus).toBe("PENDING");
    expect(queued.whatsappTemplate).toBe("dalali_viewing_requested");
    expect(queued.whatsappParams).toEqual([
      listing.title,
      formatEatNumeric(when),
      "http://localhost:3000/dashboard/viewings",
    ]);

    expect(await deliverPendingWhatsApp()).toEqual({ sent: 1, failed: 0 });
    const sent = await prisma.notification.findUniqueOrThrow({ where: { id: queued.id } });
    expect(sent.whatsappStatus).toBe("SENT");
    expect(sent.whatsappSentAt).toBeInstanceOf(Date);
    expect(log.mock.calls.flat().join("\n")).toContain(
      "to=+255712345678 template=dalali_viewing_requested (en)",
    );
  });

  it("does not use WhatsApp for people who did not opt in", async () => {
    const { landlord, listing } = await publishedListing();
    await prisma.user.update({ where: { id: landlord.id }, data: { phoneNumber: "+255712345678" } });
    await createViewingRequest(await createUser("TENANT"), {
      propertyId: listing.id,
      proposedAt: inTwoDays(),
    });
    const n = await prisma.notification.findFirstOrThrow({
      where: { userId: landlord.id, type: "viewing_requested" },
    });
    expect(n.whatsappStatus).toBeNull();
  });

  it("writes to tenants in their own language", async () => {
    const { landlord, listing } = await publishedListing();
    const tenant = await createUser("TENANT");
    await optIn(tenant.id, "sw");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const vr = await createViewingRequest(tenant, { propertyId: listing.id, proposedAt: inTwoDays() });
    await respondToViewing(landlord, vr.id, "ACCEPT");
    expect((await deliverPendingWhatsApp()).sent).toBe(1);
    expect(log.mock.calls.flat().join("\n")).toContain("Habari njema: ombi lako la kuangalia");
  });

  it("does not send a queued message after the person turns updates off", async () => {
    const { landlord, listing } = await publishedListing();
    const tenant = await createUser("TENANT");
    await optIn(tenant.id);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const vr = await createViewingRequest(tenant, { propertyId: listing.id, proposedAt: inTwoDays() });
    await respondToViewing(landlord, vr.id, "DECLINE");
    await prisma.user.update({ where: { id: tenant.id }, data: { whatsappUpdates: false } });

    expect(await deliverPendingWhatsApp()).toEqual({ sent: 0, failed: 1 });
    const n = await prisma.notification.findFirstOrThrow({
      where: { userId: tenant.id, type: "viewing_declined" },
    });
    expect(n.whatsappStatus).toBe("FAILED");
    expect(n.whatsappError).toMatch(/opted out/);
  });

  it("never sends the same message twice, even when two senders run at once", async () => {
    const { landlord, listing } = await publishedListing();
    await optIn(landlord.id);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await createViewingRequest(await createUser("TENANT"), {
      propertyId: listing.id,
      proposedAt: inTwoDays(),
    });
    const [a, b] = await Promise.all([deliverPendingWhatsApp(), deliverPendingWhatsApp()]);
    expect(a.sent + b.sent).toBe(1);
    expect(log.mock.calls.filter((c) => String(c[0]).startsWith("[whatsapp:console]"))).toHaveLength(1);
  });

  it("tells advertisers when a listing is published, and re-queues interrupted sends", async () => {
    const landlord = await createUser("LANDLORD");
    await optIn(landlord.id);
    const admin = await createUser("ADMIN");
    const listing = await createListing(landlord, validListingInput());
    await addListingImages(landlord, listing.id, [await pngFile()]);
    await submitListingForReview(landlord, listing.id);
    await moderateListing(admin, listing.id, "APPROVE", "");
    const n = await prisma.notification.findFirstOrThrow({
      where: { userId: landlord.id, type: "listing_approve" },
    });
    expect(n.whatsappTemplate).toBe("dalali_listing_published");

    // Simulate a crash after claiming the message but before sending it.
    await prisma.notification.update({
      where: { id: n.id },
      data: { whatsappStatus: "SENDING", createdAt: new Date(Date.now() - 30 * 60_000) },
    });
    expect(await requeueStuckWhatsApp()).toBe(1);
    vi.spyOn(console, "info").mockImplementation(() => {});
    expect((await deliverPendingWhatsApp()).sent).toBe(1);
  });

  it("needs a mobile number to opt in, and keeps consent when the checkbox is not on the form", async () => {
    const tenant = await createUser("TENANT");
    await expect(updateProfile(tenant, { name: "Neema", whatsappUpdates: true })).rejects.toMatchObject({
      fieldErrors: { phoneNumber: ["Add your mobile number to get WhatsApp updates"] },
    });
    await updateProfile(tenant, { name: "Neema", phoneNumber: "0712 345 678", whatsappUpdates: true });
    await updateProfile(tenant, { name: "Neema M", phoneNumber: "0712 345 678" });
    const u = await prisma.user.findUniqueOrThrow({ where: { id: tenant.id } });
    expect(u).toMatchObject({ whatsappUpdates: true, phoneNumber: "+255712345678", name: "Neema M" });
  });
});
