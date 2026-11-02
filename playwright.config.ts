import { defineConfig, devices } from "@playwright/test";

const PORT = 5302;
const BASE_URL = `http://localhost:${PORT}/akis-kanban/`;

/**
 * E2E tests run against the production static export (`npm run build` first),
 * served under the same base path GitHub Pages uses.
 */
export default defineConfig({
  testDir: "./e2e",
  testIgnore: /screenshots\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: "node scripts/serve-out.mjs",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
