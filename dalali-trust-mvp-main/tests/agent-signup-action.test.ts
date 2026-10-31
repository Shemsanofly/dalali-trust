import { beforeEach, describe, expect, it, vi } from "vitest";
import { signUpAction } from "@/app/actions/auth";
import { auth } from "@/server/auth";
import { env } from "@/server/env";
import { setInitialRole } from "@/server/services/users";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  unstable_rethrow: () => {},
  redirect: (location: string) => {
    throw new Error("redirect:" + location);
  },
}));
vi.mock("@/i18n/server", () => ({ getLocale: async () => "en" }));
vi.mock("@/server/auth", () => ({
  auth: { api: { signUpEmail: vi.fn(async () => ({ user: { id: "new-user" } })) } },
}));
vi.mock("@/server/services/users", () => ({ setInitialRole: vi.fn(async () => {}) }));

function signup(role: string, companySecretCode?: string) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    name: "Estate Member",
    email: "member@example.test",
    password: "a-strong-password-1",
    role,
    acceptTerms: "on",
  }))
    form.set(key, value);
  if (companySecretCode !== undefined) form.set("companySecretCode", companySecretCode);
  return form;
}

beforeEach(() => vi.clearAllMocks());

describe("agent company membership at sign-up", () => {
  it.each([undefined, "", "wrong-company-code"])(
    "rejects code %s before creating an account",
    async (code) => {
      const result = await signUpAction({ ok: false }, signup("AGENT", code));
      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.companySecretCode).toHaveLength(1);
      expect(auth.api.signUpEmail).not.toHaveBeenCalled();
      expect(setInitialRole).not.toHaveBeenCalled();
      expect(result.values).not.toHaveProperty("companySecretCode");
      if (code) expect(JSON.stringify(result)).not.toContain(code);
    },
  );

  it("creates an agent with the configured company code without passing it to the auth API", async () => {
    const code = env().AGENT_COMPANY_SECRET_CODE;
    await expect(signUpAction({ ok: false }, signup("AGENT", code))).rejects.toThrow(
      "redirect:/dashboard/listings/new?welcome=1",
    );
    expect(auth.api.signUpEmail).toHaveBeenCalledOnce();
    expect(auth.api.signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { name: "Estate Member", email: "member@example.test", password: "a-strong-password-1" },
      }),
    );
    expect(setInitialRole).toHaveBeenCalledWith(
      "new-user",
      "AGENT",
      undefined,
      expect.objectContaining({ companySecretCode: code }),
    );
  });

  it.each(["TENANT", "LANDLORD"])("does not require a company code for %s", async (role) => {
    await expect(signUpAction({ ok: false }, signup(role))).rejects.toThrow("redirect:/dashboard");
    expect(auth.api.signUpEmail).toHaveBeenCalledOnce();
    expect(setInitialRole).toHaveBeenCalledWith("new-user", role, undefined, expect.any(Object));
  });
});
