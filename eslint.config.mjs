import { builtinModules } from "node:module";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import expo from "eslint-config-expo/flat.js";

const WEB = ["apps/web/**", "packages/**", "*.{ts,mjs}"];
const MOBILE = ["apps/mobile/**"];

/**
 * Limit a shared preset to some workspaces. Next's and Expo's presets both
 * register the react and import plugins, which ESLint won't load twice for
 * one file, so each app gets exactly one of them. A nested `files` array
 * means "matches all of these".
 */
const scopeTo = (bases, configs) =>
  configs.map((config) => {
    const keys = Object.keys(config);
    if (keys.length === 1 && keys[0] === "ignores") return config;
    return {
      ...config,
      files: bases.flatMap((base) =>
        (config.files ?? ["**/*"]).map((pattern) => [
          base,
          ...(Array.isArray(pattern) ? pattern : [pattern]),
        ])
      ),
    };
  });

export default defineConfig([
  // Next's recommended rules (React, hooks, a11y, Next, TypeScript) for the
  // website and the shared packages; Expo's for the mobile app.
  ...scopeTo(WEB, [...nextVitals, ...nextTs]),
  ...scopeTo(MOBILE, expo),
  {
    // Resolve the mobile app's "@/" alias (apps/mobile/tsconfig.json).
    files: ["apps/mobile/**/*.{ts,tsx}"],
    settings: {
      "import/resolver": {
        typescript: { project: "apps/mobile/tsconfig.json" },
      },
    },
  },
  {
    // The Next app lives in apps/web; the shared packages sit beside it.
    settings: { next: { rootDir: "apps/web" } },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Layering (see docs/architecture.md). Type-only imports may cross
  // layers so DTO types have a single definition.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["apps/web/server/db.ts", "apps/web/app/api/keep-alive/route.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "Use createAdminClient/Db from @/server/db.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/core/**/*.{ts,tsx}", "packages/tokens/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/*",
                "@readers-choice/web",
                "@readers-choice/contract",
                "@readers-choice/contract/*",
              ],
              message:
                "packages/core and packages/tokens are pure, isomorphic code with no app or contract dependencies.",
            },
            {
              // core is shared with the mobile app (issue #75), which has no
              // Node runtime. Server-only helpers belong in apps/web/server/.
              group: [...builtinModules, "node:*"],
              message:
                "packages/core runs in browsers and React Native too; put Node-only code in apps/web/server/.",
            },
          ],
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "packages/core must not create database clients.",
              allowTypeImports: true,
            },
            {
              name: "bcryptjs",
              message:
                "Password hashing is server-only: apps/web/server/password.ts.",
            },
          ],
        },
      ],
    },
  },
  {
    // Operation contracts are shared with the mobile app: schemas and types
    // only, built from zod and packages/core.
    files: ["packages/contract/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*", "@readers-choice/web"],
              message:
                "packages/contract holds client-facing schemas and types; it may import only zod and packages/core.",
            },
            {
              group: [...builtinModules, "node:*"],
              message:
                "packages/contract runs in browsers and React Native too.",
            },
          ],
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "packages/contract never talks to the database.",
            },
            {
              name: "server-only",
              message: "packages/contract is imported by clients.",
            },
          ],
        },
      ],
    },
  },
  {
    // New actions are operations (docs/architecture.md), so the mobile app
    // can call them too (#75). The ignore list holds the domains still on
    // runAction: it only shrinks. Migrate a file, then delete its line.
    files: ["apps/web/app/actions/**/*.ts"],
    ignores: [
      "**/*.test.ts",
      "apps/web/app/actions/books.ts",
      "apps/web/app/actions/calendar.ts",
      "apps/web/app/actions/libraries.ts",
      "apps/web/app/actions/meeting-voting.ts",
      "apps/web/app/actions/meetings.ts",
      "apps/web/app/actions/nominations.ts",
      "apps/web/app/actions/rankings.ts",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/server/action",
              importNames: ["runAction"],
              message:
                "Define an operation instead (packages/contract + apps/web/server/operations) and export serverAction(op).",
            },
            {
              name: "@supabase/supabase-js",
              message: "Use createAdminClient/Db from @/server/db.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    // The mobile app is a client of /api/v1: it shares packages/contract,
    // packages/core and packages/tokens, never the website's code, the
    // database, or Node built-ins (there's no Node runtime on a phone).
    files: ["apps/mobile/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@readers-choice/web",
                "@readers-choice/web/*",
                "next",
                "next/*",
                "next-auth",
                "next-auth/*",
              ],
              message:
                "The mobile app calls the website over /api/v1; share code through packages/ instead.",
            },
            {
              group: [...builtinModules, "node:*"],
              message: "There's no Node runtime on a phone.",
            },
          ],
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "The mobile app never talks to the database.",
            },
            {
              name: "server-only",
              message: "The mobile app has no server code.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/web/server/**/*.{ts,tsx}"],
    ignores: ["apps/web/server/db.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/components/*"],
              message: "server/ must not depend on actions, routes or UI.",
            },
          ],
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "Use createAdminClient/Db from @/server/db.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "apps/web/components/**/*.{ts,tsx}",
      "apps/web/hooks/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*"],
              message:
                "Components may import server/ types only; load data in a page or call an action.",
              allowTypeImports: true,
            },
          ],
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "Components never talk to the database.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    "**/.next/**",
    // Expo build output and generated native projects.
    "**/dist/**",
    "**/.expo/**",
    "apps/mobile/ios/**",
    "apps/mobile/android/**",
    ".worktrees/**",
    "out/**",
    ".vercel/**",
    "**/public/**",
    "coverage/**",
    "scripts/**",
    ".claude/**",
    "**/next-env.d.ts",
  ]),
]);
