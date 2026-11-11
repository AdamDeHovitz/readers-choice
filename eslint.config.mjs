import { builtinModules } from "node:module";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  // Next's recommended rules: React, hooks, a11y, Next and TypeScript.
  ...nextVitals,
  ...nextTs,
  {
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
    ignores: ["server/db.ts", "app/api/keep-alive/route.ts"],
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
    files: ["lib/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "@/app/*", "@/components/*", "@/auth"],
              message:
                "lib/ is pure, isomorphic logic with no app dependencies.",
            },
            {
              // lib/ is shared with the mobile app (issue #75), which has no
              // Node runtime. Server-only helpers belong in server/.
              group: [...builtinModules, "node:*"],
              message:
                "lib/ runs in browsers and React Native too; put Node-only code in server/.",
            },
          ],
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "lib/ must not create database clients.",
              allowTypeImports: true,
            },
            {
              name: "bcryptjs",
              message: "Password hashing is server-only: server/password.ts.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["server/**/*.{ts,tsx}"],
    ignores: ["server/db.ts"],
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
    files: ["components/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}"],
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
    ".next/**",
    ".worktrees/**",
    "out/**",
    ".vercel/**",
    "public/**",
    "coverage/**",
    "scripts/**",
    ".claude/**",
    "next-env.d.ts",
  ]),
]);
