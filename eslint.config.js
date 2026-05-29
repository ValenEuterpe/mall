// Minimal ESLint v9 flat config.
//
// Goal for this project phase: a stable, deterministic lint gate that produces
// *zero lint output* (no errors, no warnings) during backend-focused work.
//
// Next.js' official ESLint config is not used here because the available
// `eslint-config-next` build triggers a circular-config crash under ESLint v9
// in this environment.

const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  {
    // Globally-ignored paths. Mirrors tsconfig.json `exclude` for test files so
    // lint and type-check agree on what counts as production code.
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/prisma/generated/**",
      "**/tsconfig.tsbuildinfo",
      // Stale worktrees from other agents — out-of-tree snapshots, not
      // production source. Lint must not double-count them.
      "**/.kilo/**",
      // Tests and test infrastructure: excluded from tsc (tsconfig.json) and
      // from lint for the same reason — different lifecycle, looser rules.
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
      "src/test-utils/**",
      "src/test-setup.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    linterOptions: {
      // Keep lint output clean; we enforce formatting/types via prettier/tsc.
      reportUnusedDisableDirectives: "off",
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: false,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      // React hooks correctness. `rules-of-hooks` is non-negotiable — any
      // violation is a runtime bug. `exhaustive-deps` stays at `warn` because
      // it produces false positives on intentional one-shot effects; CI's
      // lint gate exits 0 on warnings, so this surfaces hints without
      // breaking the build. Mass-disabling is forbidden — review per site.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // `let` bindings that are never reassigned should be `const`. The
      // auto-fixer handles this mechanically.
      "prefer-const": "error",

      // Unused symbols are a real code smell. We let the TS-aware variant
      // handle this (the core rule double-flags TypeScript constructs) and
      // allow the `_` prefix as an escape hatch for required-by-signature
      // params (route handlers, event handlers) and intentionally-ignored
      // catch bindings.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],

      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // Prisma scripts (seed, backfills) are one-shot operational code with a
    // different style budget than production source — iterative loops, ad-hoc
    // variables, and intentionally unused imports during data shape exploration
    // are normal here. Phases 1/2 keep their rules off for this scope.
    files: ["prisma/**/*.ts"],
    rules: {
      "prefer-const": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
