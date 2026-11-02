import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** Generates the README screenshots from the production build: `npm run build && npm run screenshots`. */
export default defineConfig({
  ...base,
  testIgnore: undefined,
  testMatch: /screenshots\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  projects: [{ name: "screenshots", use: { browserName: "chromium" } }],
});
