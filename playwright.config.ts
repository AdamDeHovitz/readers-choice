import { defineConfig, devices } from "@playwright/test";

// Browser tests against the local stack (npm run dev:local), never production.
// Specs only read seed data, so they can run against an already-used database;
// run `npm run db:reset` for a clean slate.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // CI adds HTML and JSON reporters on the command line (see ci.yml).
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    // A final screenshot of every test is cheap evidence; full traces only
    // when something fails.
    screenshot: "on",
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    // CI serves a production build it made while Supabase started: faster
    // than next dev compiling each page on first visit.
    command: process.env.E2E_PREBUILT
      ? "scripts/dev-local.sh --prebuilt"
      : "npm run dev:local",
    url: "http://localhost:3100/login",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
