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
        // Points d'entrée : glue de bootstrap, peu de logique propre, pas de valeur à tester unitairement.
        '**/src/main.ts',
        // Script imprératif à usage unique (seed de dev), pas une logique applicative.
        'packages/database/prisma/seed.ts',
        // Export trivial du client Prisma singleton, aucune logique.
        'packages/database/src/index.ts',
        // Composants/vues présentationnels : l'apparence sera entièrement revue plus tard.
        'apps/web/src/views/**',
        'apps/web/src/components/**',
        'apps/web/src/App.vue',
        // Table de routes déclarative + données de traduction statiques : pas de logique à couvrir.
        'apps/web/src/router/**',
        'apps/web/src/i18n/**',
        // Workers pas encore implémentés : stubs sans logique.
        'workers/**/src/main.ts',
      ],
      // Seuils appliqués uniquement au périmètre des jalons livrés.
      // Chaque nouveau jalon doit ajouter ses propres seuils ici en plus des seuils existants.
      thresholds: {
        'apps/api/src/auth/**/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'apps/api/src/health/**/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'apps/web/src/services/**/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'apps/web/src/stores/**/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
      },
    },
  },
});
