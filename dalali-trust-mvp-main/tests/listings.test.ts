import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  addListingImages,
  archiveListing,
  canViewListingImage,
  createListing,
  findPossibleDuplicates,
  getPublicListing,
  moderateListing,
  searchListings,
  submitListingForReview,
  updateAvailability,
  updateListing,
} from "@/server/services/listings";
import { createUser, pngFile, withCleanDatabase, validListingInput } from "./helpers/factories";

withCleanDatabase();

async function publishedListing(overrides: Record<string, unknown> = {}) {
  const landlord = await createUser("LANDLORD");
  const admin = await createUser("ADMIN");
  const listing = await createListing(landlord, validListingInput(overrides));
  await addListingImages(landlord, listing.id, [await pngFile()]);
  await submitListingForReview(landlord, listing.id);
  await moderateListing(admin, listing.id, "APPROVE", "");
  return { landlord, admin, listing: await prisma.property.findUniqueOrThrow({ where: { id: listing.id } }) };
}

describe("listing creation and editing", () => {
  it("lets landlords and agents create draft listings", async () => {
    for (const role of ["LANDLORD", "AGENT"] as const) {
      const user = await createUser(role);
      const listing = await createListing(user, validListingInput());
      expect(listing.status).toBe("DRAFT");
      expect(listing.advertiserId).toBe(user.id);
      expect(listing.currency).toBe("TZS");
    }
  });

  it("rejects tenants, admins and suspended advertisers", async () => {
    await expect(createListing(await createUser("TENANT"), validListingInput())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(createListing(await createUser("ADMIN"), validListingInput())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      createListing(await createUser("LANDLORD", { status: "SUSPENDED" }), validListingInput()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ignores attempts to mass-assign protected fields", async () => {
    const landlord = await createUser("LANDLORD");
    const other = await createUser("LANDLORD");
    const listing = await createListing(
      landlord,
      validListingInput({
        status: "PUBLISHED",
        advertiserId: other.id,
        publishedAt: new Date(),
        slug: "hijack",
      }),
    );
    expect(listing.status).toBe("DRAFT");
    expect(listing.advertiserId).toBe(landlord.id);
    expect(listing.publishedAt).toBeNull();
    expect(listing.slug).not.toBe("hijack");
  });

  it("validates input on the server", async () => {
    const landlord = await createUser("LANDLORD");
    await expect(createListing(landlord, validListingInput({ rentAmount: -5 }))).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await expect(createListing(landlord, validListingInput({ rentAmount: 1500.5 }))).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await expect(createListing(landlord, validListingInput({ region: "nairobi" }))).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await expect(
      createListing(landlord, validListingInput({ amenities: ["<script>"] })),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createListing(landlord, validListingInput({ contactPhone: "12345" }))).rejects.toMatchObject(
      { code: "VALIDATION" },
    );
  });

  it("does not let one advertiser edit or archive another's listing", async () => {
    const owner = await createUser("LANDLORD");
    const intruder = await createUser("AGENT");
    const listing = await createListing(owner, validListingInput());
    await expect(
      updateListing(intruder, listing.id, validListingInput({ title: "Hijacked listing title" })),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(archiveListing(intruder, listing.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(addListingImages(intruder, listing.id, [await pngFile()])).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("requires at least one photo before review", async () => {
    const landlord = await createUser("LANDLORD");
    const listing = await createListing(landlord, validListingInput());
    await expect(submitListingForReview(landlord, listing.id)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects files that are not real images", async () => {
    const landlord = await createUser("LANDLORD");
    const listing = await createListing(landlord, validListingInput());
    const fake = new File(["<html>not an image</html>"], "evil.png", { type: "image/png" });
    await expect(addListingImages(landlord, listing.id, [fake])).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("sends a published listing back to review when its content changes", async () => {
    const { landlord, listing } = await publishedListing();
    await updateListing(landlord, listing.id, validListingInput({ rentAmount: 999000 }));
    const after = await prisma.property.findUniqueOrThrow({ where: { id: listing.id } });
    expect(after.status).toBe("PENDING_REVIEW");
    expect(after.rentAmount).toBe(999000);
  });

  it("keeps a listing published when only availability is confirmed", async () => {
    const { landlord, listing } = await publishedListing();
    await updateAvailability(landlord, listing.id, { availabilityStatus: "OCCUPIED" });
    const after = await prisma.property.findUniqueOrThrow({ where: { id: listing.id } });
    expect(after.status).toBe("PUBLISHED");
    expect(after.availabilityStatus).toBe("OCCUPIED");
  });

  it("archives listings and removes them from public view", async () => {
    const { landlord, listing } = await publishedListing();
    await archiveListing(landlord, listing.id);
    expect((await searchListings({})).total).toBe(0);
    expect(await getPublicListing(listing.slug, null)).toBeNull();
  });
});

describe("moderation", () => {
  it("only administrators can approve, and approval publishes the listing", async () => {
    const landlord = await createUser("LANDLORD");
    const listing = await createListing(landlord, validListingInput());
    await addListingImages(landlord, listing.id, [await pngFile()]);
    await submitListingForReview(landlord, listing.id);
    await expect(moderateListing(landlord, listing.id, "APPROVE", "")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(moderateListing(await createUser("AGENT"), listing.id, "APPROVE", "")).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );
    await moderateListing(await createUser("ADMIN"), listing.id, "APPROVE", "");
    const after = await prisma.property.findUniqueOrThrow({ where: { id: listing.id } });
    expect(after.status).toBe("PUBLISHED");
    expect(after.publishedAt).not.toBeNull();
    expect(
      await prisma.moderationAction.count({ where: { propertyId: listing.id, action: "APPROVE_LISTING" } }),
    ).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: listing.id, action: "listing.approve" } })).toBe(
      1,
    );
  });

  it("requires a reason to reject and records it for the advertiser", async () => {
    const landlord = await createUser("LANDLORD");
    const admin = await createUser("ADMIN");
    const listing = await createListing(landlord, validListingInput());
    await addListingImages(landlord, listing.id, [await pngFile()]);
    await submitListingForReview(landlord, listing.id);
    await expect(moderateListing(admin, listing.id, "REJECT", "")).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await moderateListing(admin, listing.id, "REJECT", "Photos do not match the description");
    const after = await prisma.property.findUniqueOrThrow({ where: { id: listing.id } });
    expect(after.status).toBe("REJECTED");
    expect(after.reviewNote).toContain("Photos");
    expect(await prisma.notification.count({ where: { userId: landlord.id } })).toBe(1);
  });

  it("rejects invalid transitions", async () => {
    const landlord = await createUser("LANDLORD");
    const listing = await createListing(landlord, validListingInput());
    await expect(moderateListing(await createUser("ADMIN"), listing.id, "APPROVE", "")).rejects.toMatchObject(
      { code: "INVALID_STATE" },
    );
  });

  it("flags listings that reuse the same photo as a review aid", async () => {
    const { admin, listing } = await publishedListing();
    const copycat = await createUser("AGENT");
    const copy = await createListing(copycat, validListingInput({ title: "Copied room advert in Mwenge" }));
    await addListingImages(copycat, copy.id, [await pngFile()]);
    const matches = await findPossibleDuplicates(admin, copy.id);
    const match = matches.find((m) => m.property.id === listing.id);
    expect(match?.reasons).toContain("Shares at least one identical photo");
    expect(match?.sameAdvertiser).toBe(false);
  });
});

describe("public search", () => {
  it("returns only published listings from active advertisers", async () => {
    const { landlord } = await publishedListing();
    const draftOwner = await createUser("LANDLORD");
    await createListing(draftOwner, validListingInput({ title: "Draft listing not visible yet" }));
    expect((await searchListings({})).total).toBe(1);
    await prisma.user.update({ where: { id: landlord.id }, data: { status: "SUSPENDED" } });
    expect((await searchListings({})).total).toBe(0);
  });

  it("filters by location, type, budget and bedrooms, and sorts by price", async () => {
    await publishedListing({ rentAmount: 300000, bedrooms: 2, propertyType: "APARTMENT" });
    await publishedListing({
      rentAmount: 120000,
      region: "arusha",
      district: "Arusha City",
      neighborhood: "Njiro",
    });
    await publishedListing({ rentAmount: 800000, bedrooms: 3, propertyType: "HOUSE" });

    expect((await searchListings({ region: "arusha" })).items.map((i) => i.neighborhood)).toEqual(["Njiro"]);
    expect((await searchListings({ type: "HOUSE" })).total).toBe(1);
    expect(
      (await searchListings({ minRent: "200000", maxRent: "500000" })).items.map((i) => i.rentAmount),
    ).toEqual([300000]);
    expect((await searchListings({ bedrooms: "2" })).total).toBe(2);
    expect((await searchListings({ sort: "price_asc" })).items.map((i) => i.rentAmount)).toEqual([
      120000, 300000, 800000,
    ]);
    expect((await searchListings({ q: "njiro" })).total).toBe(1);
  });

  it("ignores malformed query parameters instead of failing", async () => {
    await publishedListing();
    const result = await searchListings({
      region: "'; DROP TABLE property;--",
      minRent: "abc",
      page: "-4",
      sort: "evil",
    });
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it("hides unpublished listing photos from the public but not from the owner", async () => {
    const landlord = await createUser("LANDLORD");
    const listing = await createListing(landlord, validListingInput());
    await addListingImages(landlord, listing.id, [await pngFile()]);
    const image = await prisma.propertyImage.findFirstOrThrow({ where: { propertyId: listing.id } });
    expect(await canViewListingImage(null, image.id)).toBeNull();
    expect(await canViewListingImage(await createUser("TENANT"), image.id)).toBeNull();
    expect(await canViewListingImage(landlord, image.id)).not.toBeNull();
  });
});
