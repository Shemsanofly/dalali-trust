import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("anonymous visitors are sent to sign-in for dashboards and admin", async ({ page }) => {
  for (const path of ["/dashboard", "/dashboard/listings/new", "/admin", "/admin/users"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in\?next=/);
  }
});

test("a tenant cannot open admin or advertiser pages", async ({ page }) => {
  await signIn(page, "tenant@sample.dalali.test");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard\?denied=1/);
  await page.goto("/dashboard/listings/new");
  await expect(page).toHaveURL(/\/dashboard\?denied=1/);
  await expect(page.getByText(/not available for your account type/i)).toBeVisible();
});

test("private evidence cannot be downloaded by the public or other users", async ({ page, request }) => {
  await signIn(page, "admin@sample.dalali.test");
  await page.goto("/admin/verifications?status=PENDING_REVIEW");
  const anyRequest = page.getByRole("link", { name: /IDENTITY/ }).first();
  if ((await anyRequest.count()) === 0) await page.goto("/admin/verifications?status=MORE_INFO_REQUIRED");
  await page
    .getByRole("link", { name: /IDENTITY/ })
    .first()
    .click();
  const href = await page
    .getByRole("link", { name: /NATIONAL_ID/ })
    .first()
    .getAttribute("href");
  expect(href).toMatch(/^\/api\/evidence\//);

  const anon = await request.get(href!, { headers: { cookie: "" } });
  expect(anon.status()).toBe(401);

  await page.context().clearCookies();
  await signIn(page, "tenant@sample.dalali.test");
  const asTenant = await page.request.get(href!);
  expect(asTenant.status()).toBe(404);
});

test("security headers are present", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-powered-by"]).toBeUndefined();
});
