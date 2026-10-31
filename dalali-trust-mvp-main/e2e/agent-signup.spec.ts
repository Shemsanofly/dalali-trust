import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "dalali_locale", value: "en", url: baseURL! }]);
});

test("shows the company secret code only when Agent is selected", async ({ page }) => {
  await page.goto("/sign-up");
  const companyCode = page.getByLabel("Enter company secret code", { exact: true });
  await expect(companyCode).toHaveCount(0);
  await page.getByRole("radio", { name: "Advertise properties for owners (agent)", exact: true }).check();
  await expect(companyCode).toBeVisible();
  await expect(companyCode).toHaveAttribute("type", "password");
  await companyCode.fill("not-retained-after-role-change");
  await page
    .getByRole("radio", { name: "Let my own property (landlord)", exact: true })
    .check({ force: true });
  await expect(companyCode).toHaveCount(0);
  await page
    .getByRole("radio", { name: "Advertise properties for owners (agent)", exact: true })
    .check({ force: true });
  await expect(companyCode).toHaveValue("");
});

test("rejects missing and incorrect agent codes and keeps the Agent role selected", async ({ page }) => {
  await page.goto("/sign-up?role=AGENT");
  const companyCode = page.getByLabel("Enter company secret code", { exact: true });
  await expect(companyCode).toBeVisible();
  await page.getByLabel("Full name", { exact: true }).fill("Estate Signup Check");
  await page.getByLabel("Email address", { exact: true }).fill(`agent-gate-${Date.now()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("a-strong-password-1");
  await page.getByRole("checkbox", { name: /I agree to the Terms/ }).check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("Enter the company secret code.", { exact: true })).toBeVisible();
  await expect(companyCode).toBeVisible();
  await companyCode.fill("wrong-company-code");
  await page.getByLabel("Password", { exact: true }).fill("a-strong-password-1");
  await page.getByRole("checkbox", { name: /I agree to the Terms/ }).check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(
    page.getByText("The company secret code is incorrect.", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Advertise properties for owners (agent)", exact: true }),
  ).toBeChecked();
});
