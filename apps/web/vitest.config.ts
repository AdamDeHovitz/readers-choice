import { defineProject } from "vitest/config";
import path from "path";

// Live-network tests (*.integration.test.ts) only run when explicitly
// requested via `npm run test:integration`.
const integration = process.env.VITEST_INTEGRATION === "1";

export default defineProject({
  test: {
    name: "web",
    globals: true,
    environment: "node",
    include: integration
      ? ["**/*.integration.test.ts"]
      : ["**/*.test.ts", "**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      ".next/**",
      "e2e/**",
      ...(integration ? [] : ["**/*.integration.test.ts"]),
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      // Throws outside React Server Components; tests are the server here.
      "server-only": path.resolve(__dirname, "test/empty-module.ts"),
    },
  },
});
