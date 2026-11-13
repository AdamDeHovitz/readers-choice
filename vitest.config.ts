import { defineConfig } from "vitest/config";

// One run covers every workspace: `npm run test:run` from the repo root.
// Live-network tests (*.integration.test.ts) only run when explicitly
// requested via `npm run test:integration`.
const integration = process.env.VITEST_INTEGRATION === "1";
const include = integration ? ["**/*.integration.test.ts"] : ["**/*.test.ts"];
const exclude = [
  "**/node_modules/**",
  ...(integration ? [] : ["**/*.integration.test.ts"]),
];

export default defineConfig({
  test: {
    projects: [
      "apps/web",
      {
        test: {
          name: "core",
          root: "packages/core",
          globals: true,
          include,
          exclude,
        },
      },
      {
        test: {
          name: "contract",
          root: "packages/contract",
          globals: true,
          include,
          exclude,
        },
      },
      {
        // Plain-TypeScript modules of the mobile app (no React Native imports).
        test: {
          name: "mobile",
          root: "apps/mobile",
          globals: true,
          include: ["src/**/*.test.ts"],
          exclude,
        },
      },
      { test: { name: "scripts", root: "scripts", include: ["**/*.test.ts"] } },
    ],
    coverage: {
      include: [
        "packages/*/**",
        "apps/web/server/**",
        "apps/web/app/actions/**",
      ],
      exclude: [
        "**/*.test.ts",
        "**/__fixtures__/**",
        "apps/web/server/database.types.ts",
      ],
    },
  },
});
