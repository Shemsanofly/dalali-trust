import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { signIn, signOut, uniqueEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

test("tenant signs up, searches, saves a home, requests a viewing and reports a listing", async ({
  page,
}) => {
  const email = uniqueEmail("tenant");
  await page.goto("/sign-up");
  await page.getByLabel(/find a home to rent/i).check();
  await page.getByLabel(/full name/i).fill("E2E Tenant");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/mobile number/i).fill("0712 345 678");
  await page.getByLabel(/^password/i).fill("a-long-e2e-password");
  await page.getByLabel(/i agree/i).check();
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Search with filters (plain GET form)
  await page.goto("/properties");
  await page.getByLabel(/^region/i).selectOption("dar-es-salaam");
  await page.getByLabel(/max rent/i).fill("400000");
  await page.getByRole("button", { name: /show results/i }).click();
  await expect(page).toHaveURL(/region=dar-es-salaam/);
  await expect(page.getByText(/homes found/)).toBeVisible();
  const cards = page.locator("article");
  await expect(cards.first()).toBeVisible();
  for (const text of await cards.locator("p.text-xl").allInnerTexts()) {
    const rent = Number(text.replace(/\D/g, ""));
    expect(rent).toBeGreaterThan(0);
    expect(rent).toBeLessThanOrEqual(400000);
  }

  // Open a listing: full cost breakdown and trust panel are shown
  await page.goto("/properties/sample-sinza-1");
  await expect(page.getByRole("heading", { name: /what you will pay/i })).toBeVisible();
  await expect(page.locator("#costs").getByText(/estimated total before moving in/i)).toBeVisible();
  await expect(page.getByText(/no check on dalali trust proves legal ownership/i)).toBeVisible();

  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByRole("button", { name: /saved/i })).toBeVisible();

  const when = new Date(Date.now() + 3 * 86_400_000 + 3 * 3600_000).toISOString().slice(0, 16);
  await page.getByLabel(/preferred date and time/i).fill(when);
  await page.getByLabel(/^message/i).fill("Can I come on Saturday morning?");
  await page.getByRole("button", { name: /send request/i }).click();
  await expect(page.getByText(/request sent/i)).toBeVisible();

  await page.getByText(/report this listing/i).click();
  await page.getByLabel(/what is wrong/i).selectOption("ADVANCE_PAYMENT_REQUEST");
  await page
    .getByLabel(/describe what happened/i)
    .fill("The person on the phone asked me to send a deposit before any viewing.");
  await page.getByRole("button", { name: /submit report/i }).click();
  await expect(page.getByText(/your report was submitted/i)).toBeVisible();

  await page.goto("/dashboard/saved");
  await expect(page.getByText(/Self-contained room near Sinza Mori/)).toBeVisible();
  await page.goto("/dashboard/viewings");
  await expect(page.getByText(/waiting for reply/i)).toBeVisible();
  await page.goto("/dashboard/reports");
  await expect(page.getByText(/asked to pay before viewing/i)).toBeVisible();
});

test("landlord lists a property, an admin approves it, and it appears in search", async ({ page }) => {
  const title = `E2E room in Tegeta ${Date.now()}`;
  await signIn(page, "landlord@sample.dalali.test");
  await page.goto("/dashboard/listings/new");
  await page.getByLabel(/^title/i).fill(title);
  await page
    .getByLabel(/^description/i)
    .fill(
      "A clean self-contained room with tiled floors, a water tank and a secure compound near the main road.",
    );
  await page.getByLabel(/^district/i).fill("Kinondoni");
  await page.getByLabel(/neighbourhood/i).fill("Tegeta");
  await page.getByLabel(/monthly rent/i).fill("210000");
  await page.getByLabel(/charge 1 name/i).fill("Security");
  await page.getByLabel(/charge 1 amount/i).fill("10000");
  await page.getByRole("button", { name: /save draft and add photos/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/listings\/[a-z0-9]+\?created=1/);

  // Submitting without photos is refused on the server
  await page.getByRole("button", { name: /submit for review/i }).click();
  await expect(page.getByText(/add at least one real photo/i)).toBeVisible();

  const photo = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 120, g: 160, b: 90 } },
  })
    .jpeg()
    .toBuffer();
  await page
    .getByLabel(/add photos/i)
    .setInputFiles({ name: "room.jpg", mimeType: "image/jpeg", buffer: photo });
  // Choosing photos uploads them straight away; no separate upload click is needed.
  await expect(page.getByText(/photos uploaded/i)).toBeVisible();
  await page.getByRole("button", { name: /submit for review/i }).click();
  await expect(page.getByText(/waiting for a moderator/i)).toBeVisible();
  const listingUrl = page.url();
  const listingId = /listings\/([a-z0-9]+)/.exec(listingUrl)![1]!;

  // Not public yet
  await signOut(page);
  await page.goto(`/properties?q=${encodeURIComponent("E2E room in Tegeta")}`);
  await expect(page.getByText(title)).toHaveCount(0);

  await signIn(page, "admin@sample.dalali.test");
  await page.goto(`/admin/listings/${listingId}`);
  await page.getByLabel("Decision").selectOption("APPROVE");
  await page.getByRole("button", { name: /record decision/i }).click();
  await expect(page.getByText(/decision recorded/i)).toBeVisible();

  await signOut(page);
  await page.goto(`/properties?q=${encodeURIComponent("E2E room in Tegeta")}`);
  await expect(page.getByText(title)).toBeVisible();
});

test("admin reviews a verification request with a recorded scope", async ({ page }) => {
  await signIn(page, "admin@sample.dalali.test");
  await page.goto("/admin/verifications");
  await page
    .getByRole("link", { name: /IDENTITY/ })
    .first()
    .click();
  await expect(page.getByText(/opening a document is recorded/i)).toBeVisible();
  await page.getByLabel("Decision").selectOption("REQUEST_INFO");
  await page.getByLabel(/^reason/i).fill("Please upload a clearer photo of the ID.");
  await page.getByRole("button", { name: /record decision/i }).click();
  await expect(page.getByText(/waiting for the applicant to provide more information/i)).toBeVisible();

  // The applicant sees the reviewer's request on their verification page.
  await page.context().clearCookies();
  await signIn(page, "agent@sample.dalali.test");
  await page.goto("/dashboard/verification");
  await expect(page.getByText(/reviewer: please upload a clearer photo/i)).toBeVisible();
});
