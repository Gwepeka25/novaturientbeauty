import { defineConfig } from "@playwright/test";
import fs from "node:fs";

// Some sandboxed dev environments pre-install a plain Chromium binary
// instead of the headless-shell variant Playwright looks for by default.
// Use it only when present; everywhere else (a real machine or CI that ran
// `npx playwright install`), this stays unset and Playwright resolves its
// own bundled browser as usual.
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium";
const executablePath = fs.existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
