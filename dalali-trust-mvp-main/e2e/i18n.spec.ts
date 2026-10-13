import { expect, test } from "@playwright/test";

test("visitors can switch the interface to Swahili and back", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page
    .getByRole("button", { name: /lugha: kiswahili/i })
    .first()
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", "sw");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/pata mahali pa kupanga/i);
  await page
    .getByRole("button", { name: /language: english/i })
    .first()
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
