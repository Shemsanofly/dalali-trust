import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Small phones, large phones, tablets and laptops: no page may scroll sideways.
const WIDTHS = [320, 375, 414, 768, 1024, 1440];

async function expectNoSidewaysScroll(page: import("@playwright/test").Page, path: string) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
  }
}

test("public pages fit every screen width", async ({ page }) => {
  for (const path of [
    "/",
    "/properties",
    "/properties/sample-sinza-1",
    "/how-it-works",
    "/for-advertisers",
    "/sign-up",
  ]) {
    await expectNoSidewaysScroll(page, path);
  }
});

test("dashboard and admin pages fit every screen width", async ({ page }) => {
  await signIn(page, "admin@sample.dalali.test");
  for (const path of ["/dashboard", "/dashboard/settings", "/admin", "/admin/listings", "/admin/users"]) {
    await expectNoSidewaysScroll(page, path);
  }
});
