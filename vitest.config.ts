import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        '**/dist/**',
        '**/generated/**',
        '**/*.config.*',
        '**/vitest.workspace.ts',
        // Entry points: bootstrap glue, little own logic, no value in unit testing them.
        '**/src/main.ts',
        // One-off imperative script (dev seed), not application logic.
        'packages/database/prisma/seed.ts',
        // Trivial export of the Prisma client singleton, no logic.
        'packages/database/src/index.ts',
        // Presentational components/views: the look and feel will be entirely redesigned later.
        'apps/web/src/views/**',
        'apps/web/src/components/**',
        'apps/web/src/App.vue',
        // Declarative route table (components + meta): no logic to cover.
        // Guard logic lives in router/guards.ts and is well covered by tests.
        'apps/web/src/router/index.ts',
        'apps/web/src/i18n/**',
        // Workers not implemented yet: stubs with no logic.
        'workers/**/src/main.ts',
        // Worker command entrypoint: orchestration only, covered through aggregator.ts tests.
        'workers/aggregator/src/runOnce.ts',
        // Shared test utilities (test helpers), not application logic.
        '**/test-utils/**',
      ],
      // Thresholds applied only to the scope of delivered milestones.
      // Each new milestone should add its own thresholds here in addition to the existing ones.
      thresholds: {
        'apps/api/src/auth/**/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'apps/api/src/health/**/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'apps/api/src/sources/**/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'apps/api/src/categories/**/*.ts': {
          statements: 90,
          branches: 80,
          functions: 90,
          'apps/api/src/proposals/**/*.ts': {
            statements: 90,
            branches: 80,
            functions: 90,
            lines: 90,
          },
          'apps/api/src/users/**/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        },
        'apps/api/src/articles/**/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'apps/api/src/comments/**/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'apps/api/src/proposals/**/*.ts': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'apps/web/src/services/**/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'apps/web/src/stores/**/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'apps/web/src/router/guards.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'workers/aggregator/src/aggregator.ts': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'workers/analyzer/src/**/*.ts': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'workers/translator/src/**/*.ts': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
});
