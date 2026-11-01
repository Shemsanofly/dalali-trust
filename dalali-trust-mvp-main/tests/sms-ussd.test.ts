// SMS is printed instead of sent ("console" provider) and USSD is on; set before the env is first read.
process.env.SMS_PROVIDER = "console";
process.env.WHATSAPP_PROVIDER = "none";
process.env.USSD_ENABLED = "true";
process.env.USSD_CALLBACK_TOKEN = "test-ussd-token-1234567890";

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ussd/route";
import { prisma } from "@/server/db";
import * as environment from "@/server/env";
import {
  addListingImages,
  createListing,
  moderateListing,
  submitListingForReview,
} from "@/server/services/listings";
import { updateProfile } from "@/server/services/users";
import { createViewingRequest, respondToViewing } from "@/server/services/viewings";
import { deliverPendingSms, requeueStuckSms } from "@/server/sms";
import { compactTZS, handleUssd, USSD_MAX_CHARS } from "@/server/ussd";
import { createUser, pngFile, validListingInput, withCleanDatabase } from "./helpers/factories";

withCleanDatabase();
afterEach(() => vi.restoreAllMocks());

async function publishedListing(overrides: Record<string, unknown> = {}) {
  const landlord = await createUser("LANDLORD");
  const admin = await createUser("ADMIN");
  const listing = await createListing(landlord, validListingInput(overrides));
  await addListingImages(landlord, listing.id, [await pngFile()]);
  await submitListingForReview(landlord, listing.id);
  await moderateListing(admin, listing.id, "APPROVE", "");
  return { landlord, admin, listing };
}

const inTwoDays = () => new Date(Date.now() + 2 * 86_400_000);
const PHONE = "+255712345678";
const dial = (text: string, phoneNumber = PHONE) =>
  handleUssd({ sessionId: "ATUid_test", serviceCode: "*384*1#", phoneNumber, text });

describe("SMS updates", () => {
  it("queues an SMS copy for people who opted in and sends it in their language", async () => {
    const { landlord, listing } = await publishedListing();
    const tenant = await createUser("TENANT");
    await prisma.user.update({
      where: { id: tenant.id },
      data: { phoneNumber: PHONE, smsUpdates: true, locale: "sw" },
    });
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const vr = await createViewingRequest(tenant, { propertyId: listing.id, proposedAt: inTwoDays() });
    await respondToViewing(landlord, vr.id, "ACCEPT");

    const n = await prisma.notification.findFirstOrThrow({
      where: { userId: tenant.id, type: "viewing_accepted" },
    });
    expect(n).toMatchObject({
      smsStatus: "PENDING",
      whatsappStatus: null,
      whatsappTemplate: "dalali_viewing_accepted",
    });
    expect(await deliverPendingSms()).toEqual({ sent: 1, failed: 0 });
    const sent = await prisma.notification.findUniqueOrThrow({ where: { id: n.id } });
    expect(sent.smsStatus).toBe("SENT");
    expect(sent.smsSentAt).toBeInstanceOf(Date);
    const out = log.mock.calls.flat().join("\n");
    expect(out).toContain(`[sms:console] to=${PHONE}`);
    expect(out).toContain("Habari njema: ombi lako la kuangalia");
  });

  it("does not text people who did not opt in, or who opted out before sending", async () => {
    const { landlord, listing } = await publishedListing();
    await prisma.user.update({ where: { id: landlord.id }, data: { phoneNumber: PHONE } });
    const tenant = await createUser("TENANT");
    await createViewingRequest(tenant, { propertyId: listing.id, proposedAt: inTwoDays() });
    const n = await prisma.notification.findFirstOrThrow({
      where: { userId: landlord.id, type: "viewing_requested" },
    });
    expect(n.smsStatus).toBeNull();
    expect(n.whatsappTemplate).toBeNull();

    await prisma.user.update({ where: { id: landlord.id }, data: { smsUpdates: true } });
    await createViewingRequest(await createUser("TENANT"), {
      propertyId: listing.id,
      proposedAt: inTwoDays(),
    });
    await prisma.user.update({ where: { id: landlord.id }, data: { smsUpdates: false } });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await deliverPendingSms()).toEqual({ sent: 0, failed: 1 });
  });

  it("never sends the same SMS twice and re-queues interrupted sends", async () => {
    const landlord = await createUser("LANDLORD");
    await prisma.user.update({ where: { id: landlord.id }, data: { phoneNumber: PHONE, smsUpdates: true } });
    const admin = await createUser("ADMIN");
    const listing = await createListing(landlord, validListingInput());
    await addListingImages(landlord, listing.id, [await pngFile()]);
    await submitListingForReview(landlord, listing.id);
    await moderateListing(admin, listing.id, "APPROVE", "");
    const n = await prisma.notification.findFirstOrThrow({
      where: { userId: landlord.id, type: "listing_approve" },
    });
    await prisma.notification.update({
      where: { id: n.id },
      data: { smsStatus: "SENDING", createdAt: new Date(Date.now() - 30 * 60_000) },
    });
    expect(await requeueStuckSms()).toBe(1);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const [a, b] = await Promise.all([deliverPendingSms(), deliverPendingSms()]);
    expect(a.sent + b.sent).toBe(1);
    expect(log.mock.calls.filter((c) => String(c[0]).startsWith("[sms:console]"))).toHaveLength(1);
  });

  it("needs a mobile number to opt in to SMS", async () => {
    const tenant = await createUser("TENANT");
    await expect(updateProfile(tenant, { name: "Neema", smsUpdates: true })).rejects.toMatchObject({
      fieldErrors: { phoneNumber: ["Add your mobile number to get SMS updates"] },
    });
    await updateProfile(tenant, { name: "Neema", phoneNumber: "0712 345 678", smsUpdates: true });
    await updateProfile(tenant, { name: "Neema M", phoneNumber: "0712 345 678" });
    const u = await prisma.user.findUniqueOrThrow({ where: { id: tenant.id } });
    expect(u).toMatchObject({ smsUpdates: true, whatsappUpdates: false });
  });
});

describe("USSD menu", () => {
  it("starts with a language choice, then the main menu", async () => {
    expect(await dial("")).toBe("CON Estate\n1. English\n2. Kiswahili");
    expect(await dial("1")).toMatch(/^CON Estate\n1\. Find a home to rent/);
    expect(await dial("2")).toMatch(/^CON Estate\n1\. Tafuta nyumba/);
    expect(await dial("7")).toMatch(/^CON Invalid choice\.\nEstate\n1\. English/);
  });

  it("finds homes by region and budget and sends details by SMS", async () => {
    const { listing } = await publishedListing();
    await publishedListing({
      title: "Two bedroom house in Njiro",
      region: "arusha",
      district: "Arusha City",
      neighborhood: "Njiro",
      propertyType: "HOUSE",
      bedrooms: 2,
      rentAmount: 400000,
    });
    // Not shown: an occupied home and an unpublished draft.
    await publishedListing({ neighborhood: "Sinza", availabilityStatus: "OCCUPIED" });
    await createListing(await createUser("LANDLORD"), validListingInput({ neighborhood: "Draftville" }));

    const regions = await dial("1*1");
    expect(regions).toContain("1. Dar es Salaam");
    expect(regions).toContain("2. Arusha");
    expect(await dial("1*1*1")).toMatch(/^CON Dar es Salaam: monthly rent\?/);

    const results = await dial("1*1*1*1");
    expect(results).toBe("CON 1 home, cheapest first:\n1. Mwenge, bedsitter 150k\n0. Back");

    const detail = await dial("1*1*1*1*1");
    expect(detail).toMatch(/^CON Mwenge, bedsitter\n/);
    expect(detail).toContain("Rent TSh 150,000/mo");
    expect(detail).toContain("Move-in TSh 450,000"); // 3 months advance; owner fee is zero
    expect(detail).toContain("1. SMS me details");
    expect(detail).not.toContain("ID checked");

    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await dial("1*1*1*1*1*1", "0712345678")).toBe(
      "END Details sent by SMS. Never pay before you have seen the home.",
    );
    const sms = log.mock.calls.flat().join("\n");
    expect(sms).toContain(`[sms:console] to=${PHONE}`);
    expect(sms).toContain(`${environment.env().APP_URL.replace(/\/$/, "")}/properties/${listing.slug}`);
    expect(await prisma.analyticsEvent.count({ where: { name: "ussd_sms_details" } })).toBe(1);
  });

  it.each(["+255755111222", undefined])(
    "uses only company contacts in SMS details (support phone: %s)",
    async (supportPhone) => {
      const { landlord, listing } = await publishedListing();
      const privatePhone = "+255788111222";
      await prisma.property.update({ where: { id: listing.id }, data: { contactPhone: privatePhone } });
      await prisma.advertiserProfile.update({
        where: { userId: landlord.id },
        data: { contactPhone: "+255799111222", showPhone: true },
      });
      vi.spyOn(environment, "env").mockReturnValue({ ...environment.env(), SUPPORT_PHONE: supportPhone });
      const log = vi.spyOn(console, "info").mockImplementation(() => {});
      expect(await dial("1*1*1*1*1*1")).toMatch(/^END Details sent by SMS/);
      const sms = log.mock.calls.flat().join("\n");
      if (supportPhone) expect(sms).toContain(`Contact: ${supportPhone}`);
      else expect(sms).not.toContain("Contact:");
      expect(sms).not.toContain(privatePhone);
      expect(sms).not.toContain("+255799111222");
    },
  );

  it("supports back (0), main menu (00), and budgets with no matches", async () => {
    await publishedListing({ rentAmount: 450000 });
    expect(await dial("1*1*1*1")).toBe("CON No homes match. Try a higher budget.\n0. Back");
    expect(await dial("1*1*1*1*0")).toMatch(/^CON Dar es Salaam: monthly rent\?/);
    expect(await dial("1*1*1*1*0*0")).toMatch(/^CON Choose region:/);
    expect(await dial("1*1*1*3*00")).toMatch(/^CON Estate\n1\. Find a home/);
    expect(await dial("1*1*1*5")).toContain("1. Mwenge, bedsitter 450k");
  });

  it("keeps a long listing screen within the USSD limit without losing its options", async () => {
    const { landlord } = await publishedListing({
      neighborhood: "Kijitonyama Mpakani Mtaa wa Mabatini Karibu na Shule",
      propertyType: "APARTMENT",
      bedrooms: 3,
      rentAmount: 1_000_000,
      availabilityStatus: "AVAILABLE_SOON",
      availableFrom: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
    });
    await prisma.verificationRequest.create({
      data: {
        subjectUserId: landlord.id,
        type: "IDENTITY",
        status: "VERIFIED",
        scopeStatement: "Identity document checked",
        decidedAt: new Date(),
      },
    });
    // Results always end with the price.
    expect(await dial("2*1*1*5")).toMatch(/\n1\. Kijitonyama Mpakani.* 1M\n0\. Rudi$/);
    const detail = await dial("2*1*1*5*1");
    expect(detail.length).toBeLessThanOrEqual(USSD_MAX_CHARS + 4);
    expect(detail).toContain("ID ya mtangazaji imekaguliwa");
    expect(detail).toMatch(/\n1\. Tuma maelezo kwa SMS\n0\. Rudi$/);
  });

  it("pages long result lists and keeps every screen short enough for USSD", async () => {
    for (let i = 0; i < 6; i++)
      await publishedListing({ neighborhood: `Kijitonyama Block ${i}`, rentAmount: 100000 + i * 1000 });
    const first = await dial("2*1*1*5");
    expect(first).toContain("Nyumba 6, nafuu kwanza:");
    expect(first).toContain("9. Zaidi");
    expect(first.length).toBeLessThanOrEqual(USSD_MAX_CHARS + 4);
    const second = await dial("2*1*1*5*9");
    expect(second).toContain("1. Kijitonyama Block 4");
    expect(second).not.toContain("9. Zaidi");
  });

  it("ends with safety tips, and says when nothing is listed", async () => {
    expect(await dial("1*2")).toMatch(/^END Stay safe: never pay/);
    expect(await dial("1*1")).toBe("END No homes are listed right now. Please try again later.");
  });

  it("formats compact prices", () => {
    expect(compactTZS(250_000)).toBe("250k");
    expect(compactTZS(1_200_000)).toBe("1.2M");
    expect(compactTZS(1_000_000)).toBe("1M");
    expect(compactTZS(900)).toBe("900");
  });
});

describe("USSD callback route", () => {
  const call = (token: string | null, fields: Record<string, string>) =>
    POST(
      new Request(`http://localhost:3000/api/ussd${token === null ? "" : `?token=${token}`}`, {
        method: "POST",
        body: new URLSearchParams(fields),
      }),
    );

  it("rejects callers without the secret token", async () => {
    expect((await call(null, { sessionId: "s", text: "" })).status).toBe(403);
    expect((await call("wrong", { sessionId: "s", text: "" })).status).toBe(403);
  });

  it("answers Africa's Talking form posts in plain text", async () => {
    const res = await call(process.env.USSD_CALLBACK_TOKEN!, {
      sessionId: "ATUid_1",
      serviceCode: "*384*1#",
      phoneNumber: PHONE,
      text: "",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toBe("CON Estate\n1. English\n2. Kiswahili");
    expect((await call(process.env.USSD_CALLBACK_TOKEN!, { text: "" })).status).toBe(400);
  });
});
