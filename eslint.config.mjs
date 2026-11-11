import { builtinModules } from "node:module";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  // Next's recommended rules: React, hooks, a11y, Next and TypeScript.
  ...nextVitals,
  ...nextTs,
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
    files: ["packages/core/**/*.{ts,tsx}"],
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
                "packages/core is pure, isomorphic logic with no app or contract dependencies.",
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
