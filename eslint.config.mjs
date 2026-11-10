import { fixupConfigRules } from "@eslint/compat";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...fixupConfigRules(pluginReact.configs.flat.recommended),
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Layering (see AGENTS.md > Architecture). Type-only imports may cross
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
          ],
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "lib/ must not create database clients.",
              allowTypeImports: true,
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
    files: ["components/**/*.{ts,tsx}"],
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
  {
    ignores: [
      ".next/**",
      ".worktrees/**",
      "node_modules/**",
      "out/**",
      ".vercel/**",
      "public/**",
      "coverage/**",
      "scripts/**",
      ".claude/**",
    ],
  },
];
