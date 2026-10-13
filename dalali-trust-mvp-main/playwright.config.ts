import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const e2eDb = process.env.E2E_DATABASE_URL;
if (!e2eDb) throw new Error("E2E_DATABASE_URL must be set (see README › Testing)");

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: /access-control|i18n/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /access-control|i18n/ },
  ],
  webServer: {
    // Uses the production build (`npm run build` first) against the dedicated e2e database.
    command: "npx next start -p 3100",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: e2eDb,
      EMAIL_PROVIDER: "none",
      STORAGE_LOCAL_DIR: "./storage-e2e",
      APP_URL: "http://localhost:3100",
      BETTER_AUTH_URL: "http://localhost:3100",
    },
  },
});
