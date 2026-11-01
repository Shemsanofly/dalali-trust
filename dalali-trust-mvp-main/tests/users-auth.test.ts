import { describe, expect, it } from "vitest";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { consumeRateLimit } from "@/server/rate-limit";
import {
  addListingImages,
  createListing,
  moderateListing,
  searchListings,
  submitListingForReview,
} from "@/server/services/listings";
import {
  adminMetrics,
  changeUserRole,
  deleteMyAccount,
  listAuditLog,
  listUsers,
  setInitialRole,
  setUserSuspended,
  toggleSaved,
  updateProfile,
  upsertAdvertiserProfile,
} from "@/server/services/users";
import { createUser, pngFile, withCleanDatabase, validListingInput } from "./helpers/factories";

withCleanDatabase();

describe("sign-up and roles", () => {
  it("creates users as tenants even if the request tries to set a role", async () => {
    const res = await auth.api.signUpEmail({
      body: {
        name: "Asha Mussa",
        email: "asha@example.test",
        password: "a-strong-password-1",
        role: "ADMIN",
        status: "ACTIVE",
      } as never,
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: res.user.id } });
    expect(user.role).toBe("TENANT");
    const account = await prisma.account.findFirstOrThrow({ where: { userId: user.id } });
    expect(account.password).toBeTruthy();
    expect(account.password).not.toContain("a-strong-password-1");
  });

  it("applies a self-service role at sign-up but never ADMIN", async () => {
    const res = await auth.api.signUpEmail({
      body: { name: "Baraka", email: "baraka@example.test", password: "a-strong-password-1" },
    });
    await expect(setInitialRole(res.user.id, "ADMIN")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await setInitialRole(res.user.id, "AGENT", "+255712345678", {
      companySecretCode: env().AGENT_COMPANY_SECRET_CODE,
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: res.user.id },
      include: { advertiserProfile: true },
    });
    expect(user.role).toBe("AGENT");
    expect(user.advertiserProfile?.displayName).toBe("Baraka");
    // Cannot be replayed once the role has been set.
    await expect(setInitialRole(res.user.id, "LANDLORD")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects weak passwords", async () => {
    await expect(
      auth.api.signUpEmail({ body: { name: "Weak", email: "weak@example.test", password: "short" } }),
    ).rejects.toBeTruthy();
  });

  it("does not grant agent access without the company secret code", async () => {
    const user = await createUser("TENANT");
    for (const companySecretCode of [undefined, "", "wrong-company-code"]) {
      await expect(setInitialRole(user.id, "AGENT", undefined, { companySecretCode })).rejects.toMatchObject({
        code: "VALIDATION",
        fieldErrors: { companySecretCode: expect.any(Array) },
      });
    }
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("TENANT");
    expect(await prisma.advertiserProfile.count({ where: { userId: user.id } })).toBe(0);
  });

  it("blocks sign-in for suspended accounts", async () => {
    const res = await auth.api.signUpEmail({
      body: { name: "Suspended", email: "susp@example.test", password: "a-strong-password-1" },
    });
    await prisma.user.update({ where: { id: res.user.id }, data: { status: "SUSPENDED" } });
    await expect(
      auth.api.signInEmail({ body: { email: "susp@example.test", password: "a-strong-password-1" } }),
    ).rejects.toBeTruthy();
  });

  it("rejects a wrong password", async () => {
    await auth.api.signUpEmail({
      body: { name: "Zuhura", email: "zuhura@example.test", password: "a-strong-password-1" },
    });
    await expect(
      auth.api.signInEmail({ body: { email: "zuhura@example.test", password: "wrong-password-123" } }),
    ).rejects.toBeTruthy();
  });
});

describe("company-only public contacts", () => {
  it.each(["LANDLORD", "AGENT"] as const)("ignores public contact fields supplied by %s", async (role) => {
    const advertiser = await createUser(role);
    await upsertAdvertiserProfile(advertiser, {
      displayName: "Asha Mussa",
      contactPhone: "+255712345678",
      whatsappNumber: "+255754111222",
      showPhone: true,
    });
    const profile = await prisma.advertiserProfile.findUniqueOrThrow({ where: { userId: advertiser.id } });
    expect(profile).toMatchObject({ contactPhone: null, whatsappNumber: null, showPhone: false });
  });
});

describe("administration authorization", () => {
  it("restricts every admin operation to administrators", async () => {
    for (const role of ["TENANT", "LANDLORD", "AGENT"] as const) {
      const user = await createUser(role);
      const target = await createUser("TENANT");
      await expect(listUsers(user)).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(adminMetrics(user)).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(listAuditLog(user)).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(changeUserRole(user, user.id, "ADMIN", "self promotion")).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(setUserSuspended(user, target.id, true, "abuse of power")).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
  });

  it("prevents admins from changing their own role or suspending themselves", async () => {
    const admin = await createUser("ADMIN");
    await expect(changeUserRole(admin, admin.id, "TENANT", "demote myself")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(setUserSuspended(admin, admin.id, true, "suspend myself")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("suspends and reinstates accounts with an audit trail and revokes sessions", async () => {
    const admin = await createUser("ADMIN");
    const landlord = await createUser("LANDLORD");
    const listing = await createListing(landlord, validListingInput());
    await addListingImages(landlord, listing.id, [await pngFile()]);
    await submitListingForReview(landlord, listing.id);
    await moderateListing(admin, listing.id, "APPROVE", "");
    await prisma.session.create({
      data: { id: "s1", token: "tok-1", userId: landlord.id, expiresAt: new Date(Date.now() + 3600_000) },
    });

    await setUserSuspended(admin, landlord.id, true, "Repeated misleading listings");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: landlord.id } })).status).toBe("SUSPENDED");
    expect(await prisma.session.count({ where: { userId: landlord.id } })).toBe(0);
    expect((await searchListings({})).total).toBe(0);
    await expect(
      createListing({ ...landlord, status: "SUSPENDED" }, validListingInput()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await setUserSuspended(admin, landlord.id, false, "Appeal accepted after review");
    expect((await searchListings({})).total).toBe(1);
    const actions = await prisma.moderationAction.findMany({
      where: { targetUserId: landlord.id },
      select: { action: true },
    });
    expect(actions.map((a) => a.action)).toEqual(expect.arrayContaining(["SUSPEND_USER", "REINSTATE_USER"]));
  });

  it("changes roles with a reason and logs it", async () => {
    const admin = await createUser("ADMIN");
    const tenant = await createUser("TENANT");
    await expect(changeUserRole(admin, tenant.id, "AGENT", "")).rejects.toMatchObject({ code: "VALIDATION" });
    await changeUserRole(admin, tenant.id, "AGENT", "Verified agency onboarding");
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: tenant.id },
      include: { advertiserProfile: true },
    });
    expect(user.role).toBe("AGENT");
    expect(user.advertiserProfile).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { action: "user.role.change", entityId: tenant.id } })).toBe(
      1,
    );
  });
});

describe("profile, saved listings and account deletion", () => {
  it("updates only allowed profile fields", async () => {
    const tenant = await createUser("TENANT");
    await updateProfile(tenant, {
      name: "New Name",
      phoneNumber: "0754 111 222",
      role: "ADMIN",
      status: "ACTIVE",
      email: "x@y.z",
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: tenant.id } });
    expect(user.name).toBe("New Name");
    expect(user.phoneNumber).toBe("+255754111222");
    expect(user.role).toBe("TENANT");
    expect(user.email).toBe(tenant.email);
  });

  it("saves only public listings and toggles", async () => {
    const landlord = await createUser("LANDLORD");
    const draft = await createListing(landlord, validListingInput());
    const tenant = await createUser("TENANT");
    await expect(toggleSaved(tenant, draft.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("anonymises personal data on account deletion", async () => {
    const tenant = await createUser("TENANT");
    await expect(deleteMyAccount(tenant, "wrong@example.test")).rejects.toMatchObject({ code: "VALIDATION" });
    await deleteMyAccount(tenant, tenant.email);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: tenant.id } });
    expect(user.status).toBe("DELETED");
    expect(user.email).not.toBe(tenant.email);
    expect(user.name).toBe("Deleted user");
  });

  it("does not let the last administrator delete their account", async () => {
    const admin = await createUser("ADMIN");
    await expect(deleteMyAccount(admin, admin.email)).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});

describe("rate limiting", () => {
  it("allows requests up to the limit within a window and then blocks", async () => {
    const rule = { window: 60, max: 3 };
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await consumeRateLimit(prisma, "test-key", rule)).allowed);
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("is safe under concurrent requests", async () => {
    const rule = { window: 60, max: 5 };
    const results = await Promise.all(
      Array.from({ length: 20 }, () => consumeRateLimit(prisma, "burst", rule)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });
});
