import { defineConfig, devices } from "@playwright/test";

// Browser tests against the local stack (npm run dev:local), never production.
// Specs only read seed data, so they can run against an already-used database;
// run `npm run db:reset` for a clean slate.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npm run dev:local",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
