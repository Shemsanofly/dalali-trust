import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createListing } from "@/server/services/listings";
import { trustSummary } from "@/server/services/trust";
import {
  addEvidence,
  decideVerification,
  DEFAULT_SCOPE,
  expireVerifications,
  purgeDecidedEvidence,
  getEvidenceForDownload,
  removeEvidence,
  startVerification,
  submitVerification,
} from "@/server/services/verification";
import {
  createUser,
  memoryStorage,
  pdfFile,
  pngFile,
  validListingInput,
  withCleanDatabase,
} from "./helpers/factories";

withCleanDatabase();

async function submittedIdentity() {
  const landlord = await createUser("LANDLORD");
  const request = await startVerification(landlord, "IDENTITY");
  await addEvidence(landlord, request.id, "NATIONAL_ID", await pngFile("id.png"));
  await addEvidence(
    landlord,
    request.id,
    "SELFIE_WITH_ID",
    await pngFile("selfie.png", { r: 1, g: 2, b: 3 }),
  );
  await submitVerification(landlord, request.id, "Please review");
  return { landlord, request };
}

describe("verification workflow", () => {
  it("starts as a draft and reuses the open request", async () => {
    const landlord = await createUser("LANDLORD");
    const a = await startVerification(landlord, "IDENTITY");
    const b = await startVerification(landlord, "IDENTITY");
    expect(a.status).toBe("DRAFT");
    expect(b.id).toBe(a.id);
  });

  it("is only available to landlords and agents", async () => {
    await expect(startVerification(await createUser("TENANT"), "IDENTITY")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("links property evidence only to the advertiser's own listing", async () => {
    const owner = await createUser("LANDLORD");
    const other = await createUser("AGENT");
    const listing = await createListing(owner, validListingInput());
    await expect(startVerification(other, "PROPERTY_EVIDENCE", listing.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const req = await startVerification(owner, "PROPERTY_EVIDENCE", listing.id);
    expect(req.propertyId).toBe(listing.id);
  });

  it("rejects evidence kinds that do not fit the check and non-document files", async () => {
    const landlord = await createUser("LANDLORD");
    const req = await startVerification(landlord, "IDENTITY");
    await expect(addEvidence(landlord, req.id, "UTILITY_BILL", pdfFile())).rejects.toMatchObject({
      code: "VALIDATION",
    });
    const exe = new File(["MZ\x90\x00binary"], "id.pdf", { type: "application/pdf" });
    await expect(addEvidence(landlord, req.id, "NATIONAL_ID", exe)).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("requires evidence before submission", async () => {
    const landlord = await createUser("LANDLORD");
    const req = await startVerification(landlord, "IDENTITY");
    await expect(submitVerification(landlord, req.id)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("records reviewer, decision time, reason, scope and expiry on approval", async () => {
    const { landlord, request } = await submittedIdentity();
    const admin = await createUser("ADMIN");
    await decideVerification(admin, request.id, "VERIFY", { reason: "ID matches selfie and account name" });
    const after = await prisma.verificationRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(after.status).toBe("VERIFIED");
    expect(after.reviewerId).toBe(admin.id);
    expect(after.decidedAt).not.toBeNull();
    expect(after.scopeStatement).toBe(DEFAULT_SCOPE.IDENTITY);
    expect(after.scopeStatement).toContain("does not confirm ownership");
    expect(after.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    const trust = await trustSummary(landlord.id);
    expect(trust.identity.state).toBe("VERIFIED");
    expect(trust.advertiserRole.state).toBe("NOT_VERIFIED");
  });

  it("only administrators can decide, and never on their own request", async () => {
    const { request } = await submittedIdentity();
    await expect(
      decideVerification(await createUser("AGENT"), request.id, "VERIFY", { reason: "looks fine" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      decideVerification(await createUser("TENANT"), request.id, "VERIFY", { reason: "looks fine" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const adminAdvertiser = await createUser("LANDLORD");
    const own = await startVerification(adminAdvertiser, "IDENTITY");
    await addEvidence(adminAdvertiser, own.id, "PASSPORT", await pngFile());
    await submitVerification(adminAdvertiser, own.id);
    await prisma.user.update({ where: { id: adminAdvertiser.id }, data: { role: "ADMIN" } });
    await expect(
      decideVerification({ ...adminAdvertiser, role: "ADMIN" }, own.id, "VERIFY", {
        reason: "self approval",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("supports requesting more information and resubmission", async () => {
    const { landlord, request } = await submittedIdentity();
    const admin = await createUser("ADMIN");
    await decideVerification(admin, request.id, "REQUEST_INFO", { reason: "Photo of ID is blurry" });
    expect((await prisma.verificationRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe(
      "MORE_INFO_REQUIRED",
    );
    await addEvidence(landlord, request.id, "NATIONAL_ID", await pngFile("clear.png", { r: 9, g: 9, b: 9 }));
    await submitVerification(landlord, request.id);
    await decideVerification(admin, request.id, "REJECT", {
      reason: "Name on ID does not match the account",
    });
    const after = await prisma.verificationRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(after.status).toBe("REJECTED");
    expect(after.scopeStatement).toBeNull();
    await expect(
      decideVerification(admin, request.id, "VERIFY", { reason: "changed mind" }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("locks evidence while under review", async () => {
    const { landlord, request } = await submittedIdentity();
    const ev = await prisma.verificationEvidence.findFirstOrThrow({ where: { requestId: request.id } });
    await expect(removeEvidence(landlord, ev.id)).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("expires verifications after their validity period", async () => {
    const { landlord, request } = await submittedIdentity();
    await decideVerification(await createUser("ADMIN"), request.id, "VERIFY", { reason: "ok matches" });
    await prisma.verificationRequest.update({
      where: { id: request.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await trustSummary(landlord.id)).identity.state).toBe("EXPIRED");
    expect(await expireVerifications()).toBe(1);
    expect((await prisma.verificationRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe(
      "EXPIRED",
    );
  });
});

describe("evidence retention", () => {
  it("purges documents after the retention period but keeps the decision record", async () => {
    const { request } = await submittedIdentity();
    await decideVerification(await createUser("ADMIN"), request.id, "VERIFY", {
      reason: "matches the account",
    });
    expect(await purgeDecidedEvidence(180)).toBe(0);
    const future = new Date(Date.now() + 200 * 86_400_000);
    expect(await purgeDecidedEvidence(180, future)).toBe(2);
    const evidence = await prisma.verificationEvidence.findMany({ where: { requestId: request.id } });
    expect(evidence.every((e) => e.purgedAt)).toBe(true);
    expect(memoryStorage.objects.size).toBe(0);
    expect((await prisma.verificationRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe(
      "VERIFIED",
    );
  });
});

describe("private document access", () => {
  it("allows only the submitter and administrators to download evidence", async () => {
    const { landlord, request } = await submittedIdentity();
    const ev = await prisma.verificationEvidence.findFirstOrThrow({ where: { requestId: request.id } });
    await expect(getEvidenceForDownload(null, ev.id)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(getEvidenceForDownload(await createUser("TENANT"), ev.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(getEvidenceForDownload(await createUser("LANDLORD"), ev.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await getEvidenceForDownload(landlord, ev.id)).storageKey).toBe(ev.storageKey);
    const admin = await createUser("ADMIN");
    expect((await getEvidenceForDownload(admin, ev.id)).storageKey).toBe(ev.storageKey);
    expect(
      await prisma.auditLog.count({ where: { action: "verification.evidence.view", actorId: admin.id } }),
    ).toBe(1);
  });

  it("stores evidence under a private storage key, never a public path", async () => {
    const { request } = await submittedIdentity();
    const ev = await prisma.verificationEvidence.findFirstOrThrow({ where: { requestId: request.id } });
    expect(ev.storageKey.startsWith("evidence/")).toBe(true);
    expect(ev.storageKey).not.toMatch(/^\/|public|https?:/);
  });

  it("never writes document contents or file names to the audit log", async () => {
    await submittedIdentity();
    const logs = await prisma.auditLog.findMany({ where: { action: "verification.evidence.add" } });
    expect(logs.length).toBe(2);
    for (const l of logs) expect(JSON.stringify(l.metadata)).not.toMatch(/id\.png|selfie|base64/);
  });
});
