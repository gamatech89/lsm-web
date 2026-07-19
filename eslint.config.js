// eslint.config.js
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  {
    // NOTE: this object must contain ONLY `ignores` — that's what makes
    // ESLint treat it as a *global* ignore. Adding any other key (rules,
    // languageOptions, linterOptions, ...) to this same object would
    // silently downgrade it to a per-block scope limiter instead.
    ignores: [
      'dist/**',
      'node_modules/**',
      // packages/* are separate sub-packages (@lsm/api-client, @lsm/types,
      // @lsm/utils), each with its own package.json/tsconfig.json/build.
      // The root `tsc --noEmit` already only covers `src` (see
      // tsconfig.json's "include"), so this mirrors that boundary rather
      // than widening this app's lint scope into someone else's package.
      // Linting them here also breaks: they aren't matched by the
      // `src/**/*.{ts,tsx}` block below, so they'd fall back to the
      // default (non-TS-aware) parser and fail on plain TS syntax
      // (interfaces, type annotations) with hard parse errors.
      'packages/**',
      // Generated build artifacts checked into the repo (emitted by
      // `tsc -b` via tsconfig.node.json), not hand-authored source.
      // vite.config.ts is the real source and is linted below.
      'vite.config.js',
      'vite.config.d.ts',
    ],
  },
  {
    // ESLint 9 defaults `linterOptions.reportUnusedDisableDirectives` to
    // 'warn'. Two files (AnalyticsPage.tsx, InvoicesPage.tsx) carry stale
    // `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
    // comments from before any lint config existed. This config never
    // enables any @typescript-eslint rule, so the directives are now
    // "unused" and would otherwise fail `--max-warnings 0`. Left as dead
    // comments rather than edited, since touching them would be modifying
    // application source for a rule unrelated to this task.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
      // Browser environment so DOM/window/etc. globals don't spuriously
      // trip no-undef (this app has no Node runtime code under src/).
      globals: { ...globals.browser },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-syntax': [
        'error',
        {
          // Query keys must come from src/lib/queryKeys.ts. Hand-written
          // literals drift into near-duplicates that no invalidation matches
          // — the bug this branch exists to fix.
          selector: "Property[key.name='queryKey'] > ArrayExpression",
          message: 'Use queryKeys.* from src/lib/queryKeys.ts, not a raw array literal.',
        },
      ],

      // --- Pre-existing noise, deliberately deferred ---
      // This repo has had zero lint coverage until this config existed, so
      // turning on eslint:recommended + react-hooks/recommended surfaces a
      // large volume of violations that predate and are unrelated to the
      // query-key migration this branch/task is about. None of these are
      // touched here; each is called out explicitly so nothing is silently
      // disabled.
      //
      // 144 hits: unused locals/params/imports across the codebase. A
      // separate, deliberate cleanup — not this task's concern.
      'no-unused-vars': 'off',
      // ~21 hits in src/, all false positives: code like
      // `{ children }: { children: React.ReactNode }` without a value-level
      // `import React from 'react'`, which is valid under the
      // "jsx": "react-jsx" runtime and compiles cleanly (see `tsc --noEmit`)
      // but confuses the core (non-type-aware) no-undef rule. This is why
      // typescript-eslint's own docs recommend turning core no-undef off
      // for TS files — tsc is the authority on genuinely undefined
      // identifiers, and it already passes.
      'no-undef': 'off',
      // 2 hits, both `{false && (...)}`-shaped: a deliberately hardcoded
      // feature flag (see AuthenticatedLayout.tsx:638, "AI chatbot hidden
      // for now"), not a logic bug.
      'no-constant-binary-expression': 'off',
      // 15 hits (warnings): pre-existing missing-dependency findings across
      // several hooks. Deciding what belongs in each dependency array
      // requires per-callsite behavioral judgment (risk of introducing
      // extra re-renders or stale closures either way) that's out of scope
      // for a lint-config task. Left off rather than silently downgraded to
      // 'warn', because `--max-warnings 0` would fail on it regardless.
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    // The factory is the one place allowed to write key literals.
    files: ['src/lib/queryKeys.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Root-level Node-context build config (not app source under src/).
    // Needs Node globals (e.g. vite.config.ts's `__dirname`) so no-undef
    // from js.configs.recommended doesn't fire on legitimate Node usage.
    files: ['vite.config.ts', 'tailwind.config.js', 'postcss.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
